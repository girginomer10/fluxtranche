// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title InvoiceNote
 * @dev Fatura ödenene kadar Senior getirisi kazanan ERC1155 notu
 */
contract InvoiceNote is ERC1155Supply, AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    
    struct InvoiceData {
        uint256 tokenId;
        address issuer;      // Fatura kesicisi
        address debtor;      // Borçlu
        uint256 amount;      // Fatura tutarı
        uint256 dueDate;     // Vade tarihi
        uint256 issuedAt;    // Kesilme tarihi
        bool isPaid;         // Ödenmiş mi?
        string description;  // Fatura açıklaması
        uint256 yieldRate;   // Senior yield rate (BPS)
    }
    
    uint256 public tokenCounter;
    mapping(uint256 => InvoiceData) public invoices;
    mapping(uint256 => uint256) public accruedYield; // tokenId => yield
    mapping(uint256 => uint256) public lastYieldUpdate; // tokenId => timestamp
    
    uint256 public constant BPS = 10_000;
    uint256 public defaultYieldRate = 500; // 5% APY
    
    event InvoiceIssued(uint256 indexed tokenId, address indexed debtor, uint256 amount, uint256 dueDate);
    event InvoicePaid(uint256 indexed tokenId, uint256 amount, uint256 totalYield);
    
    constructor() ERC1155("https://fluxtranche.io/api/invoice/{id}.json") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
    }
    
    function issueInvoice(
        address debtor,
        uint256 amount,
        uint256 dueDate,
        string calldata description
    ) external onlyRole(ISSUER_ROLE) returns (uint256 tokenId) {
        tokenCounter++;
        tokenId = tokenCounter;
        
        invoices[tokenId] = InvoiceData({
            tokenId: tokenId,
            issuer: msg.sender,
            debtor: debtor,
            amount: amount,
            dueDate: dueDate,
            issuedAt: block.timestamp,
            isPaid: false,
            description: description,
            yieldRate: defaultYieldRate
        });
        
        lastYieldUpdate[tokenId] = block.timestamp;
        
        _mint(msg.sender, tokenId, 1, "");
        
        emit InvoiceIssued(tokenId, debtor, amount, dueDate);
        return tokenId;
    }
    
    function payInvoice(uint256 tokenId) external payable {
        InvoiceData storage invoice = invoices[tokenId];
        require(msg.sender == invoice.debtor, "Not debtor");
        require(!invoice.isPaid, "Already paid");
        require(msg.value >= invoice.amount, "Insufficient payment");
        
        _updateYield(tokenId);
        
        invoice.isPaid = true;
        
        uint256 totalYield = accruedYield[tokenId];
        payable(invoice.issuer).transfer(invoice.amount + totalYield);
        
        emit InvoicePaid(tokenId, invoice.amount, totalYield);
    }
    
    function _updateYield(uint256 tokenId) internal {
        InvoiceData memory invoice = invoices[tokenId];
        if (invoice.isPaid) return;
        
        uint256 timeElapsed = block.timestamp - lastYieldUpdate[tokenId];
        uint256 yieldAmount = (invoice.amount * invoice.yieldRate * timeElapsed) / (BPS * 365 days);
        
        accruedYield[tokenId] += yieldAmount;
        lastYieldUpdate[tokenId] = block.timestamp;
    }
    
    function getCurrentYield(uint256 tokenId) external view returns (uint256) {
        InvoiceData memory invoice = invoices[tokenId];
        if (invoice.isPaid) return accruedYield[tokenId];
        
        uint256 timeElapsed = block.timestamp - lastYieldUpdate[tokenId];
        uint256 pendingYield = (invoice.amount * invoice.yieldRate * timeElapsed) / (BPS * 365 days);
        
        return accruedYield[tokenId] + pendingYield;
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
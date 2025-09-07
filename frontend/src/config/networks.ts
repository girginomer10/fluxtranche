
export const TOKEN_REGISTRY: Record<string, { symbol: string; decimals: number; chain: string }> = {
  // Cosmos SDK Tokens
  'uatom': { symbol: 'ATOM', decimals: 6, chain: 'cosmos' },
  'ibc/498A0751C798A0D9A389AA3691123DADA57DAA4FE165D5C75894505B876BA6E4': { symbol: 'USDC', decimals: 6, chain: 'cosmos' },
  'utia': { symbol: 'TIA', decimals: 6, chain: 'celestia' },
  'umntl': { symbol: 'MNTL', decimals: 6, chain: 'assetmantle' },
  'uband': { symbol: 'BAND', decimals: 6, chain: 'band' },
  'uumee': { symbol: 'UMEE', decimals: 6, chain: 'umee' },
  'uxki': { symbol: 'XKI', decimals: 6, chain: 'ki' },
  'uiris': { symbol: 'IRIS', decimals: 6, chain: 'iris' },
  'uctk': { symbol: 'CTK', decimals: 6, chain: 'shentu' },
  'ukyve': { symbol: 'KYVE', decimals: 6, chain: 'kyve' },
  'ncheq': { symbol: 'CHEQ', decimals: 9, chain: 'cheqd' },
  'udsm': { symbol: 'DSM', decimals: 6, chain: 'desmos' },
  'uflix': { symbol: 'FLIX', decimals: 6, chain: 'omniflix' },
  'ubld': { symbol: 'BLD', decimals: 6, chain: 'agoric' },
  'adym': { symbol: 'DYM', decimals: 18, chain: 'dymension' },
  'uosmo': { symbol: 'OSMO', decimals: 6, chain: 'osmosis' },
  'usomm': { symbol: 'SOMM', decimals: 6, chain: 'sommelier' },
  'usaga': { symbol: 'SAGA', decimals: 6, chain: 'saga' },
  'ubbn': { symbol: 'BABY', decimals: 6, chain: 'babylon' },
  'ulava': { symbol: 'LAVA', decimals: 6, chain: 'lava' },
  'ustrd': { symbol: 'STRD', decimals: 6, chain: 'stride' },
  'ppica': { symbol: 'PICA', decimals: 12, chain: 'picasso' },
  
  // Additional Cosmos chains
  'inj': { symbol: 'INJ', decimals: 18, chain: 'injective' },
  'usei': { symbol: 'SEI', decimals: 6, chain: 'sei' },

  // Substrate Tokens
  'avail': { symbol: 'AVAIL', decimals: 18, chain: 'avail' },
  'pica': { symbol: 'PICA', decimals: 12, chain: 'picasso' },

  // MINA
  'mina': { symbol: 'MINA', decimals: 9, chain: 'mina' },

  // Walrus Network
  'wal': { symbol: 'WAL', decimals: 9, chain: 'walrus' },

  // IKA Network
  'ika': { symbol: 'IKA', decimals: 9, chain: 'ika' },

  // Starknet
  'strk': { symbol: 'STRK', decimals: 18, chain: 'starknet' },

  // Native EVM tokens
  'native_eth': { symbol: 'ETH', decimals: 18, chain: 'ethereum' },
  'native_matic': { symbol: 'MATIC', decimals: 18, chain: 'polygon' },
  'native_bnb': { symbol: 'BNB', decimals: 18, chain: 'bsc' },
  'native_avax': { symbol: 'AVAX', decimals: 18, chain: 'avalanche' },
  'native_fx': { symbol: 'FX', decimals: 18, chain: 'functionx' },
  'native_aligned': { symbol: 'ALIGNED', decimals: 18, chain: 'aligned' }
};

export const CHAIN_CONFIG: Record<string, any> = {
    // Cosmos SDK Chains
    'cosmos': {
      name: 'Cosmos Hub',
      rest: 'https://cosmos-api.polkachu.com',
      altRest: ['https://cosmoshub-rest.publicnode.com', 'https://rest.cosmos.directory/cosmoshub', 'https://cosmos-lcd.stakely.io'],
      denom: 'uatom',
      decimals: 6,
      coin: 'ATOM'
    },
    'cosmoshub': {
      name: 'Cosmos Hub',
      rest: 'https://cosmos-api.polkachu.com',
      altRest: ['https://cosmoshub-rest.publicnode.com', 'https://rest.cosmos.directory/cosmoshub', 'https://cosmos-lcd.stakely.io'],
      denom: 'uatom',
      decimals: 6,
      coin: 'ATOM'
    },
    'celestia': {
      name: 'Celestia',
      rest: 'https://celestia-api.polkachu.com',
      altRest: ['https://public-celestia-lcd.numia.xyz', 'https://api.celestia.nodestake.top', 'https://celestia-rest.publicnode.com'],
      denom: 'utia',
      decimals: 6,
      coin: 'TIA'
    },
    'assetmantle': {
      name: 'AssetMantle',
      rest: 'https://rest.assetmantle.one',
      altRest: ['https://mantle-api.polkachu.com'],
      denom: 'umntl',
      decimals: 6,
      coin: 'MNTL'
    },
    'band': {
      name: 'Band Protocol',
      rest: 'https://laozi1.bandchain.org/api',
      altRest: ['https://band-api.polkachu.com', 'https://api.band.nodestake.top'],
      denom: 'uband',
      decimals: 6,
      coin: 'BAND'
    },
    'umee': {
      name: 'Umee',
      rest: 'https://umee-api.polkachu.com',
      altRest: ['https://api-umee-ia.cosmosia.notional.ventures', 'https://umee-rest.publicnode.com'],
      denom: 'uumee',
      decimals: 6,
      coin: 'UMEE'
    },
    'ki': {
      name: 'Ki Chain',
      rest: 'https://ki-api.polkachu.com',
      altRest: ['https://api.ki.nodestake.top', 'https://ki-rest.publicnode.com', 'https://api-mainnet.blockchain.ki'],
      denom: 'uxki',
      decimals: 6,
      coin: 'XKI'
    },
    'iris': {
      name: 'IRISnet',
      rest: 'https://rest.cosmos.directory/irisnet',
      altRest: ['https://mainnet-iris-api.konsortech.xyz', 'https://api-irisnet-01.stakeflow.io', 'https://irisnet-api.lavenderfive.com', 'https://api.iris.nodestake.top'],
      denom: 'uiris',
      decimals: 6,
      coin: 'IRIS'
    },
    'shentu': {
      name: 'Shentu',
      rest: 'https://rest.cosmos.directory/shentu',
      altRest: ['https://shentu-api.polkachu.com', 'https://shentu-api.panthea.eu', 'https://certik-rest.publicnode.com', 'https://api-certik-ia.cosmosia.notional.ventures'],
      denom: 'uctk',
      decimals: 6,
      coin: 'CTK'
    },
    'kyve': {
      name: 'Kyve',
      rest: 'https://kyve-api.polkachu.com',
      altRest: ['https://api.kyve.nodestake.top', 'https://api-kyve-ia.cosmosia.notional.ventures', 'https://kyve-rest.publicnode.com'],
      denom: 'ukyve',
      decimals: 6,
      coin: 'KYVE'
    },
    'cheqd': {
      name: 'Cheqd',
      rest: 'https://rest.lavenderfive.com:443/cheqd',
      altRest: ['https://api.cheqd.nodestake.top', 'https://cheqd-api.polkachu.com'],
      denom: 'ncheq',
      decimals: 9,
      coin: 'CHEQ'
    },
    'desmos': {
      name: 'Desmos',
      rest: 'https://rest.cosmos.directory/desmos',
      altRest: ['https://desmos-rest.staketab.org', 'https://api.mainnet.desmos.network', 'https://desmos-rest.publicnode.com', 'https://api-desmos-ia.cosmosia.notional.ventures', 'https://desmos-api.lavenderfive.com'],
      denom: 'udsm',
      decimals: 6,
      coin: 'DSM'
    },
    'omniflix': {
      name: 'OmniFlix',
      rest: 'https://omniflix-api.polkachu.com',
      altRest: ['https://api-omniflixhub-ia.cosmosia.notional.ventures', 'https://omniflix-rest.publicnode.com', 'https://api.omniflix.nodestake.top'],
      denom: 'uflix',
      decimals: 6,
      coin: 'FLIX'
    },
    'agoric': {
      name: 'Agoric',
      rest: 'https://agoric-api.polkachu.com',
      altRest: ['https://api-agoric-ia.cosmosia.notional.ventures', 'https://agoric-rest.publicnode.com', 'https://agoric-lcd.stakely.io'],
      denom: 'ubld',
      decimals: 6,
      coin: 'BLD'
    },
    'dymension': {
      name: 'Dymension',
      rest: 'https://dymension-rest.publicnode.com',
      altRest: ['https://dymension-api.polkachu.com', 'https://dymension-mainnet-rest.public.blastapi.io', 'https://dym-api.lavanet.xyz'],
      denom: 'adym',
      decimals: 18,
      coin: 'DYM'
    },
    'osmosis': {
      name: 'Osmosis',
      rest: 'https://lcd.osmosis.zone',
      altRest: ['https://osmosis-api.polkachu.com', 'https://osmosis-rest.publicnode.com', 'https://api-osmosis-ia.cosmosia.notional.ventures'],
      denom: 'uosmo',
      decimals: 6,
      coin: 'OSMO'
    },
    'sommelier': {
      name: 'Sommelier',
      rest: 'https://rest.cosmos.directory/sommelier',
      altRest: ['https://sommelier-api.polkachu.com', 'https://api-sommelier-ia.cosmosia.notional.ventures', 'https://sommelier-rest.publicnode.com'],
      denom: 'usomm',
      decimals: 6,
      coin: 'SOMM'
    },
    'saga': {
      name: 'Saga',
      rest: 'https://saga-rest.publicnode.com',
      altRest: ['https://rest-saga.ecostake.com', 'https://saga-api.polkachu.com', 'https://api.saga.nodestake.top'],
      denom: 'usaga',
      decimals: 6,
      coin: 'SAGA'
    },
    'babylon': {
      name: 'Babylon',
      rest: 'https://rest.lavenderfive.com:443/babylon',
      altRest: ['https://babylon-api.polkachu.com', 'https://babylon-rest.publicnode.com'],
      denom: 'ubbn',
      decimals: 6,
      coin: 'BABY'
    },
    'lava': {
      name: 'Lava',
      rest: 'https://lava-rpc.publicnode.com:443',
      altRest: ['https://lava-rpc.polkachu.com', 'https://lava-mainnet-rpc.itrocket.net'],
      denom: 'ulava',
      decimals: 6,
      coin: 'LAVA'
    },
    'lavanet': {
        name: 'Lava',
        rest: 'https://lava-rpc.publicnode.com:443',
        altRest: ['https://lava-rpc.polkachu.com', 'https://lava-mainnet-rpc.itrocket.net'],
        denom: 'ulava',
        decimals: 6,
        coin: 'LAVA'
    },
    'stride': {
      name: 'Stride',
      rest: 'https://stride-rpc.publicnode.com',
      altRest: ['https://stride-rpc.polkachu.com', 'https://stride.rpc.stakin-nodes.com'],
      denom: 'ustrd',
      decimals: 6,
      coin: 'STRD'
    },
    'picasso': {
      name: 'Picasso',
      rest: 'https://picasso-rpc.polkachu.com',
      altRest: [],
      denom: 'ppica',
      decimals: 12,
      coin: 'PICA'
    },
    'composable': {
        name: 'Picasso',
        rest: 'https://picasso-rpc.polkachu.com',
        altRest: [],
        denom: 'ppica',
        decimals: 12,
        coin: 'PICA'
    },
    // EVM Chains
    'ethereum': {
      name: 'Ethereum',
      rpc: 'proxy_will_be_added',
      chainId: 1,
      coin: 'ETH'
    },
    'functionx': {
      name: 'FunctionX',
      rest: 'https://fx-rest.functionx.io',
      altRest: ['https://fx-rest-backup.functionx.io'],
      denom: 'apundiai',
      decimals: 18,
      coin: 'FX'
    },
    'fx': {
      name: 'FunctionX',
      rest: 'https://fx-rest.functionx.io',
      altRest: ['https://fx-rest-backup.functionx.io'],
      denom: 'apundiai',
      decimals: 18,
      coin: 'FX'
    },
    'aligned': {
      name: 'Aligned Layer',
      rpc: 'proxy_will_be_added',
      chainId: 789,
      coin: 'ALIGNED'
    },
    // Substrate Chains
    'avail': {
      name: 'Avail',
      rpc: 'https://avail-rpc.publicnode.com/',
      altRpc: ['https://mainnet-rpc.avail.so/rpc', 'https://avail-mainnet.public.blastapi.io', 'https://avail.api.onfinality.io/public', 'https://avail-rpc.openbitlab.com/'],
      wsEndpoints: ['wss://rpc.ankr.com/avail'],
      decimals: 18,
      coin: 'AVAIL'
    },
    // Special Chains
    'mina': {
      name: 'Mina',
      api: 'https://api.minaexplorer.com',
      graphql: 'https://graphql.minaexplorer.com',
      coin: 'MINA'
    },
    'walrus': {
      name: 'Walrus',
      blockberry_url: 'https://api.blockberry.one/walrus-mainnet/v1',
      sui_rpc: 'https://fullnode.mainnet.sui.io:443',
      api_key_needed: true,
      decimals: 9,
      nodeId: '0xb588f79beb6a36d3c2c21bd68c84b447f7e17449e88d9db524fdf9aef193e89b',
      commissionReceiver: '0x9671db6f811763bdfe7a717c355deedafbfca1fc76138b33acbddb051d0727fb',
      coin: 'WAL'
    },
    'ika': {
      name: 'IKA Network',
      sui_rpc: 'https://fullnode.mainnet.sui.io:443',
      alt_rpc: 'https://ika-mainnet-1.rpc101.org',
      decimals: 9,
      validatorId: '0x037af8b8b89f04a626f2dda8b00501ee2e926dd1ee6bc152697a83656960e889',
      caps: {
        objectOperator: '0x037af8b8b89f04a626f2dda8b00501ee2e926dd1ee6bc152697a83656960e889',
        commissionCap: '0x3c9db5fc17eb67bc745178e2000f5b1ae7e94232cb2714d4e1ef23663e024cd2',
        operationCap: '0x53dda2c51388e99a0d275c300165d22a61588f11a7e2737d186663fc35d31d2c',
        validatorCap: '0x4904cf387daa00244f0c80c1fe5d606083d8bbdbdb4c71e2e7eee1fd5822d0d3'
      },
      coin: 'IKA'
    },
    'starknet': {
      name: 'Starknet',
      rpc: 'https://starknet-mainnet.public.blastapi.io',
      altRpc: ['https://starknet-mainnet.g.alchemy.com/v2/demo', 'https://rpc.starknet.lava.build', 'https://starknet.publicnode.com', 'https://free-rpc.nethermind.io/mainnet-juno'],
      decimals: 18,
      explorerApi: 'https://api.starkscan.co/api/v0',
      stakingContract: '0x0390615bdef4420db93719c06728fdc85e1f8e77e59b31de05a4e3c6c13b6b7b',
      ethToken: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      strkToken: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
      coin: 'STRK'
    },
    // Additional SSOT chains
    'injective': {
      name: 'Injective',
      rest: 'https://lcd.injective.network',
      altRest: ['https://injective-api.polkachu.com', 'https://injective-rest.publicnode.com'],
      denom: 'inj',
      decimals: 18,
      coin: 'INJ'
    },
    'sei': {
      name: 'Sei',
      rest: 'https://sei-api.polkachu.com',
      altRest: ['https://sei-rest.publicnode.com', 'https://rest.cosmos.directory/sei'],
      denom: 'usei',
      decimals: 6,
      coin: 'SEI'
    },
    'ethereum-mainnet': {
      name: 'Ethereum',
      rpc: 'https://eth.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/eth', 'https://ethereum.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api.etherscan.io',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH',
      coin: 'ETH'
    },
    'polygon': {
      name: 'Polygon',
      rpc: 'https://polygon.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/polygon', 'https://polygon.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api.polygonscan.com',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH',
      coin: 'MATIC'
    },
    'arbitrum': {
      name: 'Arbitrum',
      rpc: 'https://arbitrum.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/arbitrum', 'https://arbitrum.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api.arbiscan.io',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH',
      coin: 'ETH'
    },
    'optimism': {
      name: 'Optimism',
      rpc: 'https://optimism.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/optimism', 'https://optimism.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api-optimistic.etherscan.io',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH',
      coin: 'ETH'
    },
    'base': {
      name: 'Base',
      rpc: 'https://base.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/base', 'https://base.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api.basescan.org',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH',
      coin: 'ETH'
    },
    'bsc': {
      name: 'BNB Smart Chain',
      rpc: 'https://bsc.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/bsc', 'https://bsc.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api.bscscan.com',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH',
      coin: 'BNB'
    },
    'avalanche': {
      name: 'Avalanche',
      rpc: 'https://avalanche.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/avalanche', 'https://avalanche.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api.snowtrace.io',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH',
      coin: 'AVAX'
    },
};

export const NETWORK_COIN_CONFIG: Record<string, any> = {
    'cosmoshub|ATOM': {
      rest: 'https://cosmos-api.polkachu.com',
      altRest: ['https://cosmoshub-rest.publicnode.com', 'https://rest.cosmos.directory/cosmoshub', 'https://cosmos-lcd.stakely.io'],
      denom: 'uatom',
      decimals: 6
    },
    'cosmoshub|USDC': {
      rest: 'https://cosmos-api.polkachu.com',
      altRest: ['https://cosmoshub-rest.publicnode.com', 'https://rest.cosmos.directory/cosmoshub', 'https://cosmos-lcd.stakely.io'],
      denom: 'ibc/498A0751C798A0D9A389AA3691123DADA57DAA4FE165D5C75894505B876BA6E4',
      decimals: 6,
      fallbackBalance: true
    },
    'celestia|TIA': {
      rest: 'https://celestia-api.polkachu.com',
      altRest: ['https://public-celestia-lcd.numia.xyz', 'https://api.celestia.nodestake.top', 'https://celestia-rest.publicnode.com'],
      denom: 'utia',
      decimals: 6
    },
    'assetmantle|MNTL': {
      rest: 'https://rest.assetmantle.one',
      altRest: ['https://mantle-api.polkachu.com'],
      denom: 'umntl',
      decimals: 6
    },
    'band|BAND': {
      rest: 'https://laozi1.bandchain.org/api',
      altRest: ['https://band-api.polkachu.com', 'https://api.band.nodestake.top'],
      denom: 'uband',
      decimals: 6
    },
    'umee|UMEE': {
      rest: 'https://umee-api.polkachu.com',
      altRest: ['https://api-umee-ia.cosmosia.notional.ventures', 'https://umee-rest.publicnode.com'],
      denom: 'uumee',
      decimals: 6
    },
    'ki|XKI': {
      rest: 'https://ki-api.polkachu.com',
      altRest: ['https://api.ki.nodestake.top', 'https://ki-rest.publicnode.com', 'https://api-mainnet.blockchain.ki'],
      denom: 'uxki',
      decimals: 6,
    },
    'irisnet|IRIS': {
      rest: 'https://rest.cosmos.directory/irisnet',
      altRest: ['https://mainnet-iris-api.konsortech.xyz', 'https://api-irisnet-01.stakeflow.io', 'https://irisnet-api.lavenderfive.com', 'https://api.iris.nodestake.top'],
      denom: 'uiris',
      decimals: 6,
    },
    'shentu|CTK': {
      rest: 'https://rest.cosmos.directory/shentu',
      altRest: ['https://shentu-api.polkachu.com', 'https://shentu-api.panthea.eu', 'https://certik-rest.publicnode.com', 'https://api-certik-ia.cosmosia.notional.ventures'],
      denom: 'uctk',
      decimals: 6,
    },
    'kyve|KYVE': {
      rest: 'https://kyve-api.polkachu.com',
      altRest: ['https://api.kyve.nodestake.top', 'https://api-kyve-ia.cosmosia.notional.ventures', 'https://kyve-rest.publicnode.com'],
      denom: 'ukyve',
      decimals: 6,
    },
    'cheqd|CHEQ': {
      rest: 'https://rest.lavenderfive.com:443/cheqd',
      altRest: ['https://api.cheqd.nodestake.top', 'https://cheqd-api.polkachu.com'],
      denom: 'ncheq',
      decimals: 9
    },
    'desmos|DSM': {
      rest: 'https://rest.cosmos.directory/desmos',
      altRest: ['https://desmos-rest.staketab.org', 'https://api.mainnet.desmos.network', 'https://desmos-rest.publicnode.com', 'https://api-desmos-ia.cosmosia.notional.ventures', 'https://desmos-api.lavenderfive.com'],
      denom: 'udsm',
      decimals: 6,
    },
    'omniflix|FLIX': {
      rest: 'https://omniflix-api.polkachu.com',
      altRest: ['https://api-omniflixhub-ia.cosmosia.notional.ventures', 'https://omniflix-rest.publicnode.com', 'https://api.omniflix.nodestake.top'],
      denom: 'uflix',
      decimals: 6,
    },
    'agoric|BLD': {
      rest: 'https://agoric-api.polkachu.com',
      altRest: ['https://api-agoric-ia.cosmosia.notional.ventures', 'https://agoric-rest.publicnode.com', 'https://agoric-lcd.stakely.io'],
      denom: 'ubld',
      decimals: 6,
    },
    'dymension|DYM': {
      rest: 'https://dymension-rest.publicnode.com',
      altRest: ['https://dymension-api.polkachu.com', 'https://dymension-mainnet-rest.public.blastapi.io', 'https://dym-api.lavanet.xyz'],
      denom: 'adym',
      decimals: 18,
    },
    'osmosis|OSMO': {
      rest: 'https://lcd.osmosis.zone',
      altRest: ['https://osmosis-api.polkachu.com', 'https://osmosis-rest.publicnode.com', 'https://api-osmosis-ia.cosmosia.notional.ventures'],
      denom: 'uosmo',
      decimals: 6
    },
    'sommelier|SOMM': {
      rest: 'https://rest.cosmos.directory/sommelier',
      altRest: ['https://sommelier-api.polkachu.com', 'https://api-sommelier-ia.cosmosia.notional.ventures', 'https://sommelier-rest.publicnode.com'],
      denom: 'usomm',
      decimals: 6,
    },
    'saga|SAGA': {
      rest: 'https://saga-rest.publicnode.com',
      altRest: ['https://rest-saga.ecostake.com', 'https://saga-api.polkachu.com', 'https://api.saga.nodestake.top'],
      denom: 'usaga',
      decimals: 6,
    },
    'babylon|BABY': {
      rest: 'https://rest.lavenderfive.com:443/babylon',
      altRest: ['https://babylon-api.polkachu.com', 'https://babylon-rest.publicnode.com'],
      denom: 'ubbn',
      decimals: 6
    },
    'lava|LAVA': {
      rest: 'https://lava-rpc.publicnode.com:443',
      altRest: ['https://lava-rpc.polkachu.com', 'https://lava-mainnet-rpc.itrocket.net'],
      denom: 'ulava',
      decimals: 6
    },
    'lavanet|LAVA': {
        rest: 'https://lava-rpc.publicnode.com:443',
        altRest: ['https://lava-rpc.polkachu.com', 'https://lava-mainnet-rpc.itrocket.net'],
        denom: 'ulava',
        decimals: 6
    },
    'stride|STRD': {
      rest: 'https://stride-rpc.publicnode.com',
      altRest: ['https://stride-rpc.polkachu.com', 'https://stride.rpc.stakin-nodes.com'],
      denom: 'ustrd',
      decimals: 6
    },
    'picasso|PICA': {
      rest: 'https://picasso-rpc.polkachu.com',
      altRest: [],
      denom: 'ppica',
      decimals: 12
    },
    'composable|PICA': {
      rest: 'https://picasso-rpc.polkachu.com',
      altRest: [],
      denom: 'ppica',
      decimals: 12
    },
    'functionx|FX': {
      rest: 'https://fx-rest.functionx.io',
      altRest: ['https://fx-rest-backup.functionx.io'],
      denom: 'apundiai',
      decimals: 18
    },
    'fx|FX': {
      rest: 'https://fx-rest.functionx.io',
      altRest: ['https://fx-rest-backup.functionx.io'],
      denom: 'apundiai',
      decimals: 18
    },
    // Additional Cosmos chains
    'injective|INJ': {
      rest: 'https://lcd.injective.network',
      altRest: ['https://injective-api.polkachu.com', 'https://injective-rest.publicnode.com'],
      denom: 'inj',
      decimals: 18
    },
    'sei|SEI': {
      rest: 'https://sei-api.polkachu.com',
      altRest: ['https://sei-rest.publicnode.com', 'https://rest.cosmos.directory/sei'],
      denom: 'usei',
      decimals: 6
    },
    // EVM chains
    'ethereum|ETH': {
      rpc: 'https://eth.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/eth', 'https://ethereum.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api.etherscan.io',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH'
    },
    'polygon|MATIC': {
      rpc: 'https://polygon.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/polygon', 'https://polygon.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api.polygonscan.com',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH'
    },
    'arbitrum|ETH': {
      rpc: 'https://arbitrum.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/arbitrum', 'https://arbitrum.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api.arbiscan.io',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH'
    },
    'optimism|ETH': {
      rpc: 'https://optimism.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/optimism', 'https://optimism.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api-optimistic.etherscan.io',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH'
    },
    'base|ETH': {
      rpc: 'https://base.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/base', 'https://base.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api.basescan.org',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH'
    },
    'bsc|BNB': {
      rpc: 'https://bsc.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/bsc', 'https://bsc.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api.bscscan.com',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH'
    },
    'avalanche|AVAX': {
      rpc: 'https://avalanche.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/avalanche', 'https://avalanche.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api.snowtrace.io',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH'
    },
    // Substrate chains
    'avail|AVAIL': {
      rpc: 'https://avail-rpc.publicnode.com/',
      altRpc: ['https://mainnet-rpc.avail.so/rpc', 'https://avail-mainnet.public.blastapi.io', 'https://avail.api.onfinality.io/public', 'https://avail-rpc.openbitlab.com/'],
      wsEndpoints: ['wss://rpc.ankr.com/avail'],
      decimals: 18
    },
    // ERC-20 tokens
    'ethereum|USDC': {
      rpc: 'https://eth.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/eth', 'https://ethereum.publicnode.com'],
      decimals: 6,  // Critical: USDC uses 6 decimals, not 18
      etherscanApi: 'https://api.etherscan.io',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH'
    },
    'ethereum|STETH': {
      rpc: 'https://eth.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/eth', 'https://ethereum.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api.etherscan.io',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH'
    },
    'ethereum|CANTO': {
      rpc: 'https://eth.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/eth', 'https://ethereum.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api.etherscan.io',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH'
    },
    'ethereum|LIDO': {
      rpc: 'https://eth.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/eth', 'https://ethereum.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api.etherscan.io',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH'
    },
    'ethereum|OP-ETH': {
      rpc: 'https://eth.llamarpc.com',
      altRpc: ['https://rpc.ankr.com/eth', 'https://ethereum.publicnode.com'],
      decimals: 18,
      etherscanApi: 'https://api.etherscan.io',
      apiKey: 'E7XM7J8WABHWBQHDTGQERH2M3E91XXGBJH'
    }
  };

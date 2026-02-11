import React from 'react'
import ReactDOM from 'react-dom/client'
import { PayWithUSDC, FreighterWallet } from '@zacksonpessoa/usdc-payments-sdk'

const wallet = new FreighterWallet()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <h1>USDC Payment Demo</h1>
    <PayWithUSDC
      amount={10}
      destination="GCZ63N4R4G6H5G6H5G6H5G6H5G6H5G6H5G6H5G6H5G6H5G6H5G6H5G6H"
      wallet={wallet}
      onSuccess={(hash) => console.log('Success:', hash)}
      onError={(err) => console.error('Error:', err)}
    />
  </React.StrictMode>,
)

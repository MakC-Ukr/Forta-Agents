# Large Swap Bot

## Description

This bot detects large swaps (i.e. the amount of tokens swapped in any Pancake pair contract is a significant fraction of the
pair's pool reserves) in the PancakeSwap protocol.

> The threshold `LARGE_THRESHOLD` of what is considered large can be adjusted in `src/constants.ts`, L3.

## Supported Chains

- Binance Smart Chain

## Alerts

- CAKE-2
  - Fired when a swap is considered "large"
  - Severity is always set to "Info"
  - Type is always set to "Info"
  - Metadata:
    - `pancakePair`: The address of the swap's Pancake pair contract
    - `tokenIn`: The address of the swap's `tokenIn`
    - `tokenOut`: The address of the swap's `tokenOut`
    - `amountIn`: The swap's `amountIn` of `tokenIn`
    - `amountOut`: The swap's `amountOut` of `tokenOut`
    - `percentageIn`: The percentage of `amountIn` relative to the previous block's pair `tokenIn` balance
    - `percentageOut`: The percentage of `amountOut` relative to the previous block's pair `tokenOut` balance
    - `swapRecipient`: The swap's `to` address

## Test Data

### Mainnet

The bot behaviour can be verified with the following transactions:

- [0x99476dc1ab125e04a31a892027e51842358956ce04253b887028f4eb881afa36](https://bscscan.com/tx/0x99476dc1ab125e04a31a892027e51842358956ce04253b887028f4eb881afa36)

- [0xbfd8af2d95ffef4b42086240cec1d5d681a19a31174c08e3210883e5e4561e60](https://bscscan.com/tx/0xbfd8af2d95ffef4b42086240cec1d5d681a19a31174c08e3210883e5e4561e60)

  > `LARGE_THRESHOLD` should be set to <= 2.5 for these test transactions.

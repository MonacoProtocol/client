<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

*   [Trade][1]
    *   [Properties][2]
*   [TradeAccounts][3]
    *   [Properties][4]
*   [CreateTradeResponse][5]
    *   [Properties][6]
*   [TradePdaResponse][7]
    *   [Properties][8]

## Trade

Type: {purchaser: PublicKey, market: PublicKey, order: PublicKey, oppositeTrade: PublicKey, marketOutcomeIndex: [number][9], forOutcome: [boolean][10], stake: BN, price: [number][9], creationTimestamp: BN, payer: PublicKey}

### Properties

*   `purchaser` **PublicKey**&#x20;
*   `market` **PublicKey**&#x20;
*   `order` **PublicKey**&#x20;
*   `oppositeTrade` **PublicKey**&#x20;
*   `marketOutcomeIndex` **[number][9]**&#x20;
*   `forOutcome` **[boolean][10]**&#x20;
*   `stake` **BN**&#x20;
*   `price` **[number][9]**&#x20;
*   `creationTimestamp` **BN**&#x20;
*   `payer` **PublicKey**&#x20;

## TradeAccounts

Type: {tradeAccounts: [Array][11]\<GetAccount<[Trade][1]>>}

### Properties

*   `tradeAccounts` **[Array][11]\<GetAccount<[Trade][1]>>**&#x20;

## CreateTradeResponse

Type: {tradePk: PublicKey, tnxID: ([string][12] | void)}

### Properties

*   `tradePk` **PublicKey**&#x20;
*   `tnxID` **([string][12] | void)**&#x20;

## TradePdaResponse

Type: {tradePk: PublicKey, distinctSeed: [string][12]}

### Properties

*   `tradePk` **PublicKey**&#x20;
*   `distinctSeed` **[string][12]**&#x20;

[1]: #trade

[2]: #properties

[3]: #tradeaccounts

[4]: #properties-1

[5]: #createtraderesponse

[6]: #properties-2

[7]: #tradepdaresponse

[8]: #properties-3

[9]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number

[10]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean

[11]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array

[12]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String
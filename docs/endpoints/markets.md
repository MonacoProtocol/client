<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

*   [getMarket][1]
    *   [Parameters][2]
    *   [Examples][3]
*   [getMarkets][4]
    *   [Parameters][5]
    *   [Examples][6]

## getMarket

For the provided market publicKey, get the market account details.

### Parameters

*   `program` **Program** {program} anchor program initialized by the consuming client
*   `marketPk` **PublicKey** {PublicKey} publicKey of the market

### Examples

```javascript
const marketPk = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
const market = await getMarket(program, marketPK)
```

Returns **MarketAccount** market account details

## getMarkets

For the provided list of market publicKeys, get the market account details for each.

### Parameters

*   `program` **Program** {program} anchor program initialized by the consuming client
*   `marketPks` **[Array][7]\<PublicKey>** {PublicKey} publicKey of a market

### Examples

```javascript
const marketPk1 = new PublicKey('7o1PXyYZtBBDFZf9cEhHopn2C9R4G6GaPwFAxaNWM33D')
const marketPk2 = new PublicKey('4JKcFnuBRH8YDnJDHqAn4MTQhCCqAHywB8hTceu4bc2h')
const marketPks = [marketPk1, marketPk2]
const markets = await getMarkets(program, marketPks)
```

Returns **MarketAccounts** list of market account details

[1]: #getmarket

[2]: #parameters

[3]: #examples

[4]: #getmarkets

[5]: #parameters-1

[6]: #examples-1

[7]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array
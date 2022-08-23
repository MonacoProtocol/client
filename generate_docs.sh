#!/bin/bash

declare -a endpoints=(
    "bet_order_query"
    "bet_order"
    "cancel_bet_order"
    "create_bet_order"
    "market_matching_pools"
    "market_outcomes"
    "market_position"
    "market_prices"
    "market_query"
    "markets"
    "utils"
    "wallet_tokens"
)

declare -a types=(
    "bet_order"
    "client"
    "errors"
    "get_account"
    "market_position"
    "market"
    "matching_pool"
    "protocol"
    "wallet_tokens"
)

npm run build

for endpoint in ${endpoints[@]}; do
    rm -R docs/endpoints/${endpoint}.md
    echo "Generating docs for endpoints/${endpoint}"
    documentation build --document-exported src/${endpoint}.d.ts -f md >> docs/endpoints/${endpoint}.md
done

for type in ${types[@]}; do
    rm -R docs/types/${type}.md
    echo "Generating docs for types/${type}"
    documentation build --document-exported types/${type}.d.ts -f md >> docs/types/${type}.md
done

npm run clean

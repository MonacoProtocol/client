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

npm run build

for endpoint in ${endpoints[@]}; do
    rm -R docs/${endpoint}.md
    echo "Generating docs for ${endpoint}"
    documentation build --document-exported src/${endpoint}.d.ts -f md >> docs/${endpoint}.md
done

npm run clean

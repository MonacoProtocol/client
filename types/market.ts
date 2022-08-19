import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { BetOrder } from "./bet_order";
import { GetAccount } from "./get_account";

export enum MarketStatus {
  Open = 0x00,
  Locked = 0x01,
  ReadyForSettlement = 0x02,
  Settled = 0x03,
  Complete = 0x04,
}

export type MarketAccount = {
  authority: BN;
  decimalLimit: number;
  escrowAccountBump: number;
  eventAccount: PublicKey;
  marketLockTimestamp: BN;
  marketOutcomes: string[];
  marketSettleTimestamp?: null;
  marketStatus: MarketStatus;
  marketType: string;
  marketWinningOutcomeIndex?: number;
  mintAccount: PublicKey;
  published: boolean;
  suspended: boolean;
  title: string;
};

export type MarketAccounts = {
  markets: GetAccount<MarketAccount>[];
};

export type MarketMatchingPoolAccount = {
  betOrders: {
    front: number;
    len: number;
    items: PublicKey[];
  };
  liquidityAmount: BN;
  matchedAmount: BN;
  purchaser: PublicKey;
};

export type MarketMatchingPoolAccounts = {
  marketMatchingPools: GetAccount<MarketMatchingPoolAccount>[];
};

export type MarketOutcomeAccount = {
  title: string;
  market: PublicKey;
  latestMatchedOdds: number;
  matchedTotal: BN;
  oddsLadder: number[];
};

export type MarketOutcomeAccounts = {
  marketOutcomeAccounts: MarketOutcomeAccount[];
};

export type MarketOutcomePDAs = {
  marketOutcomePDAs: PublicKey[];
};

export type MarketAccountsForCreateBetOrder = {
  escrowPda: PublicKey;
  marketOutcomePda: PublicKey;
  marketOutcomePoolPda: PublicKey;
  marketPositionPda: PublicKey;
  market: MarketAccount;
};

export type MarketPrice = {
  marketOutcome: string;
  odds: number;
  backing: boolean;
  matchingPoolPda: PublicKey;
  matchingPool: MarketMatchingPoolAccount;
};

export type MarketPrices = {
  market: MarketAccount;
  pendingBetOrders: BetOrder[];
  marketPrices: MarketPrice[];
};

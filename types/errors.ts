enum ClientErrors {
  M001 = "No cancellable bet orders found.",
}

export type ClientError = {
  errorCode: string;
  errorMessage: ClientErrors;
};

export const NoCancellableBetOrdersFound: ClientError = {
  errorCode: "M001",
  errorMessage: ClientErrors.M001,
};

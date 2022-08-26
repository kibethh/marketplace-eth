import { useEffect } from "react";
import useSWR from "swr";

const adminAddresses = {
  "0xb00d71c576241cbe12a3f7798f3939ba7e426400a530c6f7ae1ce82f2cf613ca": true,
};

export const handler = (web3, provider) => () => {
  const { data, mutate, ...rest } = useSWR(
    () => (web3 ? "web3/accounts" : null),
    async () => {
      const accounts = await web3.eth.getAccounts();

      const account = accounts[0];
      if (!account) {
        throw new Error(
          "Cannot retrieve an account! Please refresh the browser"
        );
      }
      return account;
    }
  );

  useEffect(() => {
    provider &&
      provider.on("accountsChanged", (accounts) => mutate(accounts[0] ?? null));
  }, [provider]);

  return {
    data,
    isAdmin: (data && adminAddresses[web3.utils.keccak256(data)]) ?? false,
    mutate,
    ...rest,
  };
};

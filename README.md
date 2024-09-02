# Firn's UI

To fire this up, use

```
npm run dev
```
or
```
npm run build
```
for production.

This codebase will _not_ work out-of-the-box. You will first need to:
- deploy Firn's [contracts](https://github.com/firnprotocol/contracts) and populate the appropriate addresses in [`addresses.tsx`](./src/constants/addresses.tsx).
- run an instance of Firn's [relay](https://github.com/firnprotocol/relay), and populate the resulting publicly available relay address in [`relay.tsx`](./src/utils/relay.tsx).
- populate the various API keys in [`App.tsx`](./src/App.tsx).
import { createApp } from "./app.js";

const { app, config } = createApp();

app.listen(config.port, () => {
  console.log(
    `[gateway] listening on ${config.port} as ${config.serviceLabel} (${config.environmentLabel})`
  );
});

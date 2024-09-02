const address = "https://relay.url"; // add the endpoint of the relay here

export async function relayFetch(endpoint, body) {
  // wraps regular fetch.
  // not doing any timeout for now.
  const init = {
    method: "POST",
    mode: "cors", // is this necessary?!? check.
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
  const response = await fetch(`${address}/${endpoint}`, init);
  if (!response.ok) throw response; // does this ever happen?
  return response.json();
}

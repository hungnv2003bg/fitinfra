const API_URL = "/api/sops";

export async function getSOPs() {
  const res = await fetch(API_URL);
  return res.json();
}

export async function addSOPs(sops) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sops),
  });
  return res.json();
}


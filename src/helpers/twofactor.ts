let APIKEY = process.env.TWO_FACTOR_API_KEY || "";
if (APIKEY === "") {
  throw new Error("Missing 2Factor api key in environment");
}
const TwoFactor = new (require("2factor"))(APIKEY); 

export { TwoFactor };
import * as z from "zod";

export const createShippingAddressSchema = z.object({
  shopName: z.string({ required_error: "Shop name is required" }),
  landmark: z.string({ required_error: "Landmark is required" }),
  address: z.string({ required_error: "Address is required" }),
  longitude: z.number({ required_error: "Longitude is required" }),
  latitude: z.number({ required_error: "Latitude is required" }),
});

export const ShippingAddressSchemaValidation = {
  createShippingAddressSchema,
};

import { Prisma } from "@prisma/client";
import prisma from "../shared/prisma";

async function getModelKeys(modelName: string): Promise<string[]> {
  try {
    // Dynamically access the model from the Prisma client
    const model = (Prisma as any)[modelName]; // Type assertion to 'any'

    if (!model) {
      console.warn(`Model '${modelName}' not found on Prisma client.`);
      return [];
    }

    // Attempt to find the first record of the model
    const sampleRecord = await model.findFirst();

    if (!sampleRecord) {
      console.warn(
        `No records found for model '${modelName}'. Ensure your database has at least one record to correctly retrieve model keys.`,
      );
      return [];
    }

    // Extract the keys from the sample record object
    const keys = Object.keys(sampleRecord);
    return keys;
  } catch (error) {
    console.error(`Error getting model keys for '${modelName}':`, error);
    return [];
  } finally {
    await prisma.$disconnect();
  }
}


export default getModelKeys

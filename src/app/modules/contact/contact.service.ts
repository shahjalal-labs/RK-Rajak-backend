import { contact, PrismaClient } from "@prisma/client";
import getModelKeys from "../../../helpers/getModelKeys";
import QueryBuilder from "../../builder/QueryBuilder";
const prisma = new PrismaClient();

const createContact = async (data: contact) => {
  return await prisma.contact.create({ data });
};

const getAllContacts = async (query: any) => {
  const keys = await getModelKeys("Contact");
  const contactQuery = new QueryBuilder(prisma.contact, query, keys);
  const result = await contactQuery
    .search(["email", "lastName", "firstName"])
    .filter()
    .sort()
    .exclude()
    .include()
    .paginate()
    .execute();
  const pagination = await contactQuery.countTotal();
  return {
    meta: pagination,
    result,
  };
};

const getContactById = async (id: string) => {
  return await prisma.contact.findUnique({ where: { id } });
};

const updateContact = async (id: string, data: any) => {
  return await prisma.contact.update({ where: { id }, data });
};

const deleteContact = async (id: string) => {
  return await prisma.contact.delete({ where: { id } });
};

export const contactServices = {
  createContact,
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact,
};

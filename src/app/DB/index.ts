import { UserRole } from "@prisma/client";
import prisma from "../../shared/prisma";

const superAdminData = {
  fullName: "Super Admin",
  phone: "01700000000",
  email: "superadmin@gmail.com",
  role: UserRole.SuperAdmin,
};
const adminData = {
  fullName: "Admin",
  phone: "01700000001",
  email: "admin@gmail.com",
  role: UserRole.Admin,
};
const ownerData = {
  fullName: "Owner",
  phone: "01700000002",
  email: "owner@gmail.com",
  role: UserRole.Owner,
};

const seedSuperAdmin = async () => {
  try {
    // Check if a super admin already exists
    const isSuperAdminExists = await prisma.user.findFirst({
      where: {
        role: UserRole.SuperAdmin,
      },
    });
    const isAdminExists = await prisma.user.findFirst({
      where: {
        role: UserRole.Admin,
      },
    });
    const isOwnerExists = await prisma.user.findFirst({
      where: {
        role: UserRole.Owner,
      },
    });

    if (!isAdminExists) {
      await prisma.user.create({
        data: adminData,
      });
      console.log("🙎‍♂️Admin created successfully.");
    }
    if (!isOwnerExists) {
      await prisma.user.create({
        data: ownerData,
      });
      console.log("🙎‍♂️Owner created successfully.");
    }
    // If not, create one
    if (!isSuperAdminExists) {
      await prisma.user.create({
        data: superAdminData,
      });
      console.log("🦸 Super Admin created successfully.");
    } else {
      return;
      //   console.log("Super Admin already exists.");
    }
  } catch (error) {
    console.error("Error seeding From DB Author setup:", error);
  }
};

export default seedSuperAdmin;

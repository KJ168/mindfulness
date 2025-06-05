const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.findAllUsers = async () => prisma.user.findMany();

exports.findUserById = async (id) => prisma.user.findUnique({
    where: { id },
});

exports.findUserByEmail = async (email) => prisma.user.findUnique({
    where: { email },
});

exports.findUserByName = async (name) => prisma.user.findUnique({
    where: { name },
});

exports.createUser = async (data) => prisma.user.create({
    data: data,
});

exports.updateUser = async (id, data) => prisma.user.update({
    where: { id },
    data: { ...data },
});

exports.deleteUser = async (id) => prisma.user.delete({
    where: { id },
});

import { AuthService } from './../auth/auth.service';
import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { AuthUserDto, CreateUserDto, CreateUserSchema, RegisterUserDto, UpdateUserDto, UpdateUserSchema, UserRoleDto } from './dto/user.dto';
import { DbService } from 'src/db/db.service';
import { hashPassword } from 'src/common/utils/hash.util';
import { generateUsername } from 'src/common/utils/characters.util';
import { Prisma, UserRole } from '@prisma/client';
import { UploadService } from 'src/upload/upload.service';
import { HttpException } from '@nestjs/common';
@Injectable()
export class UserService {
  constructor(
    private readonly dbService: DbService,
    private readonly uploadService: UploadService,
    private readonly authService: AuthService
  ) { }

  async create(createUserDto: CreateUserDto) {
    const validation = CreateUserSchema.safeParse(createUserDto);
    if (!validation.success) {
      throw new BadRequestException('Invalid user data provided');
    }

    const { email, name, password } = validation.data;

    try {
      const user = await this.dbService.user.findUnique({
        where: { email },
      });

      if (user) {
        throw new BadRequestException(`Email ${email} is already in use`);
      }

      const hashedPassword = password
        ? await hashPassword(password)
        : undefined;

      return await this.dbService.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          username: generateUsername(name),
        },
      });

    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const targetMeta = (error.meta as any)?.target;
        const target = Array.isArray(targetMeta)
          ? targetMeta.join(', ')
          : targetMeta ?? 'field';
        throw new BadRequestException(
          target === 'User_email_key'
            ? `Email ${email} is already in use`
            : `A user with this ${target} already exists.`
        );
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findAll(role?: UserRoleDto) {
    try {
      const users = role
        ? await this.dbService.user.findMany({ where: { role } })
        : await this.dbService.user.findMany();

      const safeUsers = users.map(({ password, ...rest }) => rest);
      return safeUsers;

    } catch (error) {
      throw new NotFoundException({
        message: 'Something went wrong while retrieving users',
        error,
      });
    }
  }

  async findOne(id?: string, email?: string, username?: string) {
    if (!id && !email && !username) {
      throw new BadRequestException('You must provide id, email or username to find a user');
    }

    const where = id ? { id } : email ? { email } : { username };

    try {
      const user = await this.dbService.user.findUnique({ where });

      if (!user) {
        const identifier = id || email || username;
        throw new NotFoundException(`User not found with identifier: ${identifier}`);
      }

      return user;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw new InternalServerErrorException('Error fetching user', error?.message);
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto, request: AuthUserDto, role?: string) {
    if (request.id !== id && request.role !== "ADMIN") throw new BadRequestException("You are not allowed to update other account")
    const validation = UpdateUserSchema.safeParse(updateUserDto);
    if (!validation.success) {
      throw new BadRequestException('Invalid user update data');
    }

    const { email, username, password, image, ...rest } = validation.data;

    try {
      const user = await this.dbService.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('User not found');

      const [emailExists, usernameExists] = await Promise.all([
        email ? this.dbService.user.findUnique({ where: { email } }) : null,
        username ? this.dbService.user.findUnique({ where: { username } }) : null,
      ]);

      if (emailExists && emailExists.id !== id) {
        throw new BadRequestException(`Email ${email} is already in use`);
      }

      if (usernameExists && usernameExists.id !== id) {
        throw new BadRequestException(`Username ${username} is already in use`);
      }

      const hashedPassword = password ? await hashPassword(password) : undefined;

      let imageUrl = user.image;

      if (image && typeof image === 'string' && image.startsWith('data:image')) {
        // Delete old image if it exists
        if (user.image) {
          const oldImagePublicId = this.extractCloudinaryPublicId(user.image);
          if (oldImagePublicId) {
            await this.uploadService.deleteImage(oldImagePublicId);
          }
        }

        // Upload new image
        const uploaded = await this.uploadService.uploadBase64Image(image, 'avatars');
        imageUrl = uploaded.secure_url;
      }

      const update = await this.dbService.user.update({
        where: { id },
        data: {
          ...rest,
          email,
          username,
          password: hashedPassword,
          image: imageUrl,
        },
      });

      if (role === "onboarding") {
        const update_session = await this.authService.signIn(update);
        return update_session
      }
      const { password: _, ...safeUser } = user;
      return safeUser
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw new InternalServerErrorException(`Failed to update user error is : ${error}`, error?.message);
    }
  }


  private extractCloudinaryPublicId(imageUrl?: string | null): string | null {
    if (!imageUrl || !imageUrl.includes('cloudinary')) return null;

    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1];
    const publicId = filename.split('.')[0];
    const folder = parts[parts.length - 2];

    return `${folder}/${publicId}`;
  }

  async remove(id: string) {
    try {
      await this.dbService.user.delete({ where: { id } });
      return { message: `User with ID ${id} has been removed successfully.` };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw new InternalServerErrorException('Failed to delete user', error?.message);
    }
  }
}

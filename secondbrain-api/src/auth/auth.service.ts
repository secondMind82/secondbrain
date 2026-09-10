import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { SocialLoginDto } from './dto/social-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import * as appleSigninAuth from 'apple-signin-auth';


@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

async signup(signupDto: SignupDto) {
  const existingUser = await this.prisma.user.findUnique({
    where: {
      email: signupDto.email,
    },
  });

  if (existingUser) {
    throw new BadRequestException('Email already exists');
  }

  const hashedPassword = await bcrypt.hash(signupDto.password, 10);

  const user = await this.prisma.user.create({
    data: {
      fullName: signupDto.fullName,
      email: signupDto.email,
      password: hashedPassword,
    },
  });

  const payload = {
    sub: user.id,
    email: user.email,
  };

  const accessToken = await this.jwtService.signAsync(payload);

  return {
    message: 'User created successfully',

    accessToken,

    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt,
    },
  };
}

async login(loginDto: LoginDto) {
  const user = await this.prisma.user.findUnique({
    where: {
      email: loginDto.email,
    },
  });

  if (!user) {
    throw new BadRequestException('Invalid email or password');
  }

  if (!user.password) {
    throw new BadRequestException('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(
    loginDto.password,
    user.password,
  );

  if (!isPasswordValid) {
    throw new BadRequestException('Invalid email or password');
  }

  const payload = {
    sub: user.id,
    email: user.email,
  };

  const accessToken = await this.jwtService.signAsync(payload);

  return {
    message: 'Login successful',
    accessToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    },
  };
}

// ==========================================
// GOOGLE SOCIAL LOGIN
// ==========================================

async googleLogin(dto: SocialLoginDto) {
  const clientId =
    this.configService.get<string>('GOOGLE_WEB_CLIENT_ID');

  if (!clientId) {
    throw new BadRequestException(
      'GOOGLE_WEB_CLIENT_ID is not configured',
    );
  }

  const client = new OAuth2Client(clientId);

  let payload: { [key: string]: any } | undefined;

  try {
    const ticket = await client.verifyIdToken({
      idToken: dto.idToken,
      audience: clientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw new UnauthorizedException('Invalid Google token');
  }

  if (!payload || !payload.email) {
    throw new UnauthorizedException('Invalid Google token');
  }

  const email = payload.email.toLowerCase();
  const fullName =
    payload.name ||
    [payload.given_name, payload.family_name]
      .filter(Boolean)
      .join(' ') ||
    email.split('@')[0];
  const providerId = payload.sub;

  let user = await this.prisma.user.findFirst({
    where: {
      provider: 'GOOGLE',
      providerId,
    },
  });

  if (!user) {
    const existingByEmail =
      await this.prisma.user.findUnique({
        where: { email },
      });

    if (existingByEmail) {
      user = await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: { provider: 'GOOGLE', providerId },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          fullName,
          email,
          provider: 'GOOGLE',
          providerId,
        },
      });
    }
  }

  const jwtPayload = {
    sub: user.id,
    email: user.email,
  };

  const accessToken =
    await this.jwtService.signAsync(jwtPayload);

  return {
    message: 'Login successful',
    accessToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    },
  };
}

// ==========================================
// APPLE SOCIAL LOGIN
// ==========================================

async appleLogin(dto: AppleLoginDto) {
  const bundleId =
    this.configService.get<string>('APPLE_BUNDLE_ID');

  if (!bundleId) {
    throw new BadRequestException(
      'APPLE_BUNDLE_ID is not configured',
    );
  }

  let payload: any;

  try {
    payload = await appleSigninAuth.verifyIdToken(
      dto.identityToken,
      {
        audience: bundleId,
      },
    );
  } catch {
    throw new UnauthorizedException('Invalid Apple token');
  }

  if (!payload || !payload.sub) {
    throw new UnauthorizedException('Invalid Apple token');
  }

  const email = (payload.email || dto.email || '').toLowerCase();
  const providerId = payload.sub;
  const fullName =
    dto.fullName || (email ? email.split('@')[0] : 'Apple User');

  let user = await this.prisma.user.findFirst({
    where: {
      provider: 'APPLE',
      providerId,
    },
  });

  if (!user) {
    const existingByEmail = email
      ? await this.prisma.user.findUnique({
          where: { email },
        })
      : null;

    if (existingByEmail) {
      user = await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: { provider: 'APPLE', providerId },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          fullName,
          email,
          provider: 'APPLE',
          providerId,
        },
      });
    }
  }

  const jwtPayload = {
    sub: user.id,
    email: user.email,
  };

  const accessToken =
    await this.jwtService.signAsync(jwtPayload);

  return {
    message: 'Login successful',
    accessToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    },
  };
}

// ==========================================
// GET CURRENT PROFILE
// ==========================================

async getProfile(userId: string) {

  const user = await this.prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      phone: true,
      bio: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new UnauthorizedException(
      'User not found',
    );
  }

  return user;
}

async updateProfile(
  userId: string,
  dto: UpdateProfileDto,
) {
  const existingUser =
    await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

  if (!existingUser) {
    throw new UnauthorizedException(
      'User not found',
    );
  }


  // ==========================================
  // CHECK USERNAME
  // ==========================================

  if (
    dto.username &&
    dto.username !== existingUser.username
  ) {

    const usernameExists =
      await this.prisma.user.findFirst({
        where: {
          username: dto.username,
          NOT: {
            id: userId,
          },
        },
      });

    if (usernameExists) {
      throw new BadRequestException(
        'Username already exists',
      );
    }
  }


  // ==========================================
  // CHECK EMAIL
  // ==========================================

  if (
    dto.email &&
    dto.email !== existingUser.email
  ) {

    const emailExists =
      await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          NOT: {
            id: userId,
          },
        },
      });

    if (emailExists) {
      throw new BadRequestException(
        'Email already exists',
      );
    }
  }


  // ==========================================
  // UPDATE USER
  // ==========================================

  const user =
    await this.prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        fullName: dto.fullName,

        ...(dto.username !== undefined && {
          username: dto.username,
        }),

        ...(dto.email !== undefined && {
          email: dto.email,
        }),

        ...(dto.phone !== undefined && {
          phone: dto.phone,
        }),

        ...(dto.bio !== undefined && {
          bio: dto.bio,
        }),

        ...(dto.avatar !== undefined && {
          avatar: dto.avatar,
        }),
      },
    });


  // ==========================================
  // RESPONSE
  // ==========================================

  return {
    message: 'Profile updated successfully',

    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      bio: user.bio,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  };
}
async changePassword(
  userId: string,
  dto: ChangePasswordDto,
) {

  const user = await this.prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  if (!user.password) {
    throw new UnauthorizedException(
      'User has no password set - use social login',
    );
  }

  const isPasswordValid = await bcrypt.compare(
    dto.currentPassword,
    user.password,
  );

  if (!isPasswordValid) {
    throw new UnauthorizedException(
      'Current password is incorrect',
    );
  }

  if (dto.newPassword !== dto.confirmPassword) {
    throw new BadRequestException(
      'New passwords do not match',
    );
  }

  const hashedPassword = await bcrypt.hash(
    dto.newPassword,
    10,
  );

  await this.prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      password: hashedPassword,
    },
  });

  return {
    message: 'Password changed successfully',
  };
}

}
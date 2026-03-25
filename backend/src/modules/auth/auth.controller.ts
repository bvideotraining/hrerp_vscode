import { Controller, Post, Get, Body, HttpCode, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register new user' })
  async signup(
    @Body() signupDto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signup(signupDto);
    res.cookie('jwtToken', result.accessToken, COOKIE_OPTIONS);
    const { accessToken, ...userInfo } = result;
    return userInfo;
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'User login' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    res.cookie('jwtToken', result.accessToken, COOKIE_OPTIONS);
    const { accessToken, ...userInfo } = result;
    return userInfo;
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout — clear auth cookie' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jwtToken', { path: '/' });
    return { success: true };
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset user password' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.newPassword);
  }

  @Get('me')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile fresh from database' })
  async getMe(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.authService.getProfile(userId);
  }
}

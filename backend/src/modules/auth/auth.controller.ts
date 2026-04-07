import { Controller, Post, Get, Body, HttpCode, UseGuards, Request, Res, UnauthorizedException, BadRequestException } from '@nestjs/common';
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

  @Post('firebase-token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange Firebase ID token for system JWT (mobile app)' })
  async firebaseTokenExchange(
    @Body() dto: { idToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!dto?.idToken) throw new UnauthorizedException('idToken is required');
    try {
      const result = await this.authService.exchangeFirebaseToken(dto.idToken);
      res.cookie('jwtToken', result.accessToken, COOKIE_OPTIONS);
      // Return token in response body so the Android app can store it
      // (HTTP-only cookies are inaccessible from native mobile clients)
      return {
        success: true,
        message: 'Token exchanged successfully',
        data: {
          jwtToken: result.accessToken,
          expiresIn: 86400,
        },
      };
    } catch (error: any) {
      const msg: string = error?.message || 'Authentication failed';
      // Only mask as 401 when it's a genuinely invalid/expired Firebase token.
      // For "user not found", surface the real message so clients can act on it.
      const isTokenError =
        msg.toLowerCase().includes('firebase') ||
        msg.toLowerCase().includes('token') ||
        (error?.code || '').startsWith('auth/');
      if (isTokenError) throw new UnauthorizedException(msg);
      throw new BadRequestException(msg);
    }
  }
}

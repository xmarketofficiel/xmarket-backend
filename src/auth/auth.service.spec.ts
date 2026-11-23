/// <reference types="jest" />
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';

describe('Community registration', () => {
  const jwt = new JwtService({ secret: 'test-access-secret', signOptions: { expiresIn: '1h' } });
  const proofSecret = 'test-access-secret:community-registration';
  let users: { findByEmail: jest.Mock; create: jest.Mock; update: jest.Mock };
  let otp: { generateOtp: jest.Mock; verifyOtp: jest.Mock };
  let email: { sendOtpEmail: jest.Mock };
  let auth: AuthService;
  const registration: CompleteRegistrationDto = {
    email: 'student@um6p.ma', firstName: 'Test', lastName: 'Student',
    department: 'UM6P', role: 'student', address: 'UM6P Ben Guerir',
    whatsappNumber: '0612345678', password: 'test-password', registrationToken: '',
  };

  beforeEach(() => {
    users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async data => ({ id: 1, ...data, passwordHash: 'hash' })),
      update: jest.fn(),
    };
    otp = { generateOtp: jest.fn().mockResolvedValue('123456'), verifyOtp: jest.fn().mockResolvedValue(true) };
    email = { sendOtpEmail: jest.fn().mockResolvedValue(undefined) };
    const config = new ConfigService({
      JWT_SECRET: 'test-access-secret', JWT_REFRESH_SECRET: 'test-refresh-secret', JWT_REFRESH_EXPIRES_IN: '7d',
    });
    auth = new AuthService(users as any, jwt, config, otp as any, email as any);
  });

  afterEach(() => jest.restoreAllMocks());

  it.each(['student@um6p.ma', 'staff@um6p.ma', 'user@student.1337.ma', ' STAFF@UM6P.MA '])(
    'accepts a community email: %s', emailAddress => {
      expect(auth.checkEmailEligibility(emailAddress).eligible).toBe(true);
    },
  );

  it.each(['external@gmail.com', 'staff@emines.um6p.ma', 'user@1337.ma', 'student@um6p.ma.example.com', 'user@foo.student.1337.ma']) (
    'rejects an external email without sending OTP: %s', async emailAddress => {
      await expect(auth.sendOtp({ email: emailAddress })).rejects.toThrow(UnauthorizedException);
      expect(otp.generateOtp).not.toHaveBeenCalled();
      expect(email.sendOtpEmail).not.toHaveBeenCalled();
    },
  );

  it('does not issue membership proof when OTP verification fails', async () => {
    otp.verifyOtp.mockResolvedValue(false);
    await expect(auth.verifyOtp({ email: registration.email, otp: 'wrong-code' })).rejects.toThrow();
  });

  it.each(['student', 'staff'] as const)('registers a verified community %s', async role => {
    const proof = await auth.verifyOtp({ email: registration.email, otp: '123456' });
    const response = await auth.completeRegistration({ ...registration, role, registrationToken: proof.registrationToken });
    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ userRole: role, isVerified: true }));
    expect(jwt.verify(response.access_token).sub).toBe(1);
    expect(response.user.passwordHash).toBeUndefined();
    expect(() => jwt.verify(proof.registrationToken)).toThrow();
  });

  it('rejects direct signup without community verification', async () => {
    await expect(auth.completeRegistration(registration)).rejects.toThrow(UnauthorizedException);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('binds membership proof to the verified email', async () => {
    const proof = await auth.verifyOtp({ email: registration.email, otp: '123456' });
    await expect(auth.completeRegistration({
      ...registration, email: 'someone-else@um6p.ma', registrationToken: proof.registrationToken,
    })).rejects.toThrow(UnauthorizedException);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('rejects expired membership proof', async () => {
    const registrationToken = jwt.sign({
      email: registration.email, verification: 'email-otp', purpose: 'community-registration',
    }, { secret: proofSecret, expiresIn: -1 });
    await expect(auth.completeRegistration({ ...registration, registrationToken })).rejects.toThrow(UnauthorizedException);
  });

  it('does not accept an ordinary access token as community verification', async () => {
    const registrationToken = jwt.sign({ email: registration.email, sub: 1 });
    await expect(auth.completeRegistration({ ...registration, registrationToken })).rejects.toThrow(UnauthorizedException);
  });

  it('registers a 1337 community member using the same email verification flow', async () => {
    const emailAddress = 'member@student.1337.ma';
    const proof = await auth.verifyOtp({ email: emailAddress, otp: '123456' });
    await auth.completeRegistration({ ...registration, email: emailAddress, registrationToken: proof.registrationToken });
    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ email: emailAddress, userRole: 'student' }));
  });

  it('rejects legacy Discord membership proof even if it is signed', async () => {
    const registrationToken = jwt.sign({
      email: 'member@gmail.com', institution: '1337', purpose: 'community-registration',
    }, { secret: proofSecret, expiresIn: '15m' });
    await expect(auth.completeRegistration({ ...registration, email: 'member@gmail.com', registrationToken }))
      .rejects.toThrow(UnauthorizedException);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('does not allow external accounts to log in to the community marketplace', async () => {
    jest.spyOn(auth, 'validateUser').mockResolvedValue({ id: 2, email: 'external@gmail.com', isVerified: true });
    await expect(auth.login({ email: 'external@gmail.com', password: 'test-password' }))
      .rejects.toThrow(UnauthorizedException);
  });
});

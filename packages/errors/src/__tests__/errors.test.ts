/* eslint-env jest */
import {
  AppError,
  APIError,
  ValidationError,
  DatabaseError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from '../index'
import { isAppError, isValidationError, isAuthError, isNotFoundError } from '../type-guards'

describe('AppError', () => {
  it('should create an error with message and string code', () => {
    const error = new AppError('Test message', 'TEST_CODE', 500)
    expect(error.message).toBe('Test message')
    expect(error.code).toBe('TEST_CODE')
    expect(error.statusCode).toBe(500)
    expect(error.name).toBe('AppError')
  })

  it('should create an error with message and options object', () => {
    const cause = new Error('Cause error')
    const error = new AppError('Test message', {
      code: 'TEST_CODE',
      statusCode: 500,
      context: { foo: 'bar' },
      cause,
      extraParam: 'extra',
    })

    expect(error.message).toBe('Test message')
    expect(error.code).toBe('TEST_CODE')
    expect(error.statusCode).toBe(500)
    expect(error.cause).toBe(cause)
    expect(error.context).toEqual({ foo: 'bar', extraParam: 'extra' })
  })

  it('should create an error with just a message', () => {
    const error = new AppError('Test message')
    expect(error.message).toBe('Test message')
    expect(error.code).toBeUndefined()
    expect(error.statusCode).toBeUndefined()
  })
})

describe('ValidationError', () => {
  it('should correctly assign validation specific options', () => {
    const error = new ValidationError('Invalid field', {
      field: 'email',
      value: 'bad-email',
      context: { userId: 123 },
    })

    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.statusCode).toBe(400)
    expect(error.name).toBe('ValidationError')
    expect(error.context).toEqual({
      userId: 123,
      field: 'email',
      value: 'bad-email',
    })
  })
})

describe('HTTP Errors', () => {
  it('AuthError', () => {
    const err = new AuthError('Unauthorized')
    expect(err.code).toBe('AUTH_ERROR')
    expect(err.statusCode).toBe(401)
  })

  it('ForbiddenError', () => {
    const err = new ForbiddenError('Forbidden')
    expect(err.code).toBe('FORBIDDEN_ERROR')
    expect(err.statusCode).toBe(403)
  })

  it('NotFoundError', () => {
    const err = new NotFoundError('Not Found')
    expect(err.code).toBe('NOT_FOUND')
    expect(err.statusCode).toBe(404)
  })

  it('ConflictError', () => {
    const err = new ConflictError('Conflict')
    expect(err.code).toBe('CONFLICT_ERROR')
    expect(err.statusCode).toBe(409)
  })

  it('RateLimitError', () => {
    const err = new RateLimitError('Too Many Requests')
    expect(err.code).toBe('RATE_LIMIT_ERROR')
    expect(err.statusCode).toBe(429)
  })
})

describe('APIError', () => {
  it('should create from Response object', () => {
    const mockResponse = { status: 418 } as Response
    const err = new APIError('API failed', mockResponse)

    expect(err.code).toBe('API_ERROR')
    expect(err.statusCode).toBe(418)
    expect(err.response).toBe(mockResponse)
  })

  it('should create from options object', () => {
    const err = new APIError('API failed', {
      code: 'CUSTOM_API_ERR',
      statusCode: 502,
    })
    expect(err.code).toBe('CUSTOM_API_ERR')
    expect(err.statusCode).toBe(502)
  })
})

describe('DatabaseError', () => {
  it('should create database error', () => {
    const err = new DatabaseError('DB failed')
    expect(err.code).toBe('DATABASE_ERROR')
    expect(err.statusCode).toBe(500)
  })
})

describe('Type Guards', () => {
  it('should correctly identify error types', () => {
    const appErr = new AppError('Base')
    const valErr = new ValidationError('Val')
    const authErr = new AuthError('Auth')
    const notFoundErr = new NotFoundError('Not Found')

    expect(isAppError(appErr)).toBe(true)
    expect(isAppError(new Error())).toBe(false)

    expect(isValidationError(valErr)).toBe(true)
    expect(isValidationError(appErr)).toBe(false)

    expect(isAuthError(authErr)).toBe(true)
    expect(isAuthError(appErr)).toBe(false)

    expect(isNotFoundError(notFoundErr)).toBe(true)
    expect(isNotFoundError(appErr)).toBe(false)
  })
})

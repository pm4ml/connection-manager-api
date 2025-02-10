const chai = require('chai');
const sinon = require('sinon');
const rp = require('request-promise-native');
const Wso2Client = require('../../../src/service/Wso2Client');
const Constants = require('../../../src/constants/Constants');
const UnauthorizedError = require('../../../src/errors/UnauthorizedError');

const { expect } = chai;


describe('Wso2Client', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('getToken', () => {
        it('should return a token when credentials are correct', async () => {
            const username = 'testuser';
            const password = 'testpassword';
            const tokenResponse = JSON.stringify({ access_token: 'testtoken' });

            sinon.stub(rp, 'post').resolves(tokenResponse);

            const result = await Wso2Client.getToken(username, password);
            expect(result).to.deep.equal({ access_token: 'testtoken' });
        });

        it('should throw UnauthorizedError when authentication fails', async () => {
            const username = 'testuser';
            const password = 'wrongpassword';
            const error = new Error('Authentication failed');
            error.statusCode = 400;

            sinon.stub(rp, 'post').rejects(error);

            try {
                await Wso2Client.getToken(username, password);
            } catch (err) {
                expect(err).to.be.instanceOf(UnauthorizedError);
                expect(err.message).to.equal(`Authentication failed for user ${username}`);
            }
        });
    });

    describe('resetPassword', () => {
        it('should return success when password is reset', async () => {
            const username = 'testuser';
            const newPassword = 'newpassword';
            const userguid = 'userguid';
            const successResponse = { success: true };

            sinon.stub(rp, 'put').resolves(successResponse);

            const result = await Wso2Client.resetPassword(username, newPassword, userguid);
            expect(result).to.deep.equal(successResponse);
        });

        it('should throw UnauthorizedError when reset password fails', async () => {
            const username = 'testuser';
            const newPassword = 'newpassword';
            const userguid = 'userguid';
            const error = new Error('Authentication failed');
            error.statusCode = 400;

            sinon.stub(rp, 'put').rejects(error);

            try {
                await Wso2Client.resetPassword(username, newPassword, userguid);
            } catch (err) {
                expect(err).to.be.instanceOf(UnauthorizedError);
                expect(err.message).to.equal(`Authentication failed for user ${username}`);
            }
        });
    });
   //05/02/2025
    it('should log the received token response', async () => {
      const username = 'testuser';
      const password = 'testpassword';
      const tokenResponse = JSON.stringify({ access_token: 'testtoken' });
  
      const consoleLogSpy = sinon.spy(console, 'log');
      const postStub = sinon.stub(rp, 'post').returns({
        form: () => ({
          auth: () => Promise.resolve(tokenResponse)
        })
      });
  
      await Wso2Client.getToken(username, password);
  
      expect(consoleLogSpy.calledWith(`Wso2Client.getToken received ${tokenResponse}`)).to.be.true;
  
      consoleLogSpy.restore();
      postStub.restore();
    });

    it('should return parsed token response', async () => {
      const username = 'testuser';
      const password = 'testpassword';
      const tokenResponse = JSON.stringify({ access_token: 'testtoken' });
  
      const postStub = sinon.stub(rp, 'post').returns({
        form: () => ({
          auth: () => Promise.resolve(tokenResponse)
        })
      });
  
      const result = await Wso2Client.getToken(username, password);
      expect(result).to.deep.equal({ access_token: 'testtoken' });
  
      postStub.restore();
    });
  
    it('should throw UnauthorizedError for authentication failure', async () => {
      const username = 'testuser';
      const password = 'testpassword';
      const errorResponse = {
        statusCode: 400,
        message: 'Authentication failed',
        error: 'Invalid credentials'
      };
  
      const postStub = sinon.stub(rp, 'post').returns({
        form: () => ({
          auth: () => Promise.reject(errorResponse)
        })
      });
  
      try {
        await Wso2Client.getToken(username, password);
      } catch (err) {
        expect(err).to.be.instanceOf(UnauthorizedError);
        expect(err.message).to.equal(`Authentication failed for user ${username}`);
        expect(err.payload.authErrors).to.equal('Invalid credentials');
      }
  
      postStub.restore();
    });
  


    it('should throw error for other failures', async () => {
      const username = 'testuser';
      const password = 'testpassword';
      const errorResponse = new Error('Some other error');
  
      const postStub = sinon.stub(rp, 'post').returns({
        form: () => ({
          auth: () => Promise.reject(errorResponse)
        })
      });
  
      try {
        await Wso2Client.getToken(username, password);
      } catch (err) {
        expect(err).to.equal(errorResponse);
      }
  
      postStub.restore();
    });
});
import fs from 'fs-extra';
import Koa from 'koa';
import KoaRouter from 'koa-router';
import _ from 'lodash';
import { ICertificateOptions, ICertificateService } from './interfaces';
import { CertificateService } from './CertificateService';
import { CertificateStorage } from './CertificateStorage';

declare module 'koa' {
  interface BaseContext {
    certificate: ICertificateService;
  }
}

export function createCertificateService(options: ICertificateOptions) {
  fs.ensureDir(options.storagePath);
  const certStorage = new CertificateStorage(options, {});
  return new CertificateService(options.rootKey, certStorage);
}
export default (app: Koa, router: KoaRouter, options: ICertificateOptions) => {
  const certService = createCertificateService(options);
  app.context.certificate = certService;

  const selfRouter = new KoaRouter();
  selfRouter.get('/rootCA', async (ctx) => {
    ctx.set('Content-disposition', 'attachment;filename=koagentCA.crt');
    ctx.body = (await certService.getRoot()).cert;
  });

  router.use('/certificate', selfRouter.routes(), selfRouter.allowedMethods());
};
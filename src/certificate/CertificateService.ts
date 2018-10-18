import { promisify } from 'es6-promisify';
import parseDomain from 'parse-domain';
import pem from 'pem';
import {
  ICertificateService,
  ICertificateStorage,
  ICertificateModel,
} from './interfaces';

const pemCreateCertificate = promisify(pem.createCertificate);

export class CertificateService implements ICertificateService {
  /**
   * @param storage 证书存储服务
   * @param cache 缓存服务
   */
  constructor(private rootKey: string, private storage: ICertificateStorage) {}
  /**
   * 为域名获取证书
   * @param host
   * @returns {Promise<Certification>}
   */
  public async getCertificationForHost(host: string) {
    let domain = host;
    /**
     * 解析后 www.baidu.com
     * {
     *   domain: "baidu"
     *   subdomain: "www"
     *   tld: "com"
     *  }
     * @type {*}
     */
    const parsed = parseDomain(host);
    // 寻找一级域名
    if (parsed && parsed.subdomain) {
      const subdomainList = parsed.subdomain.split('.');
      subdomainList.shift();
      if (subdomainList.length > 0) {
        domain = ['*', ...subdomainList, parsed.domain, parsed.tld].join('.');
      }
    }
    return this.getCertification(domain);
  }

  async getCertification(key: string): Promise<ICertificateModel> {
    if (await this.storage.has(key)) {
      return this.storage.get(key);
    }
    const model = await this.create(key);
    this.storage.set(key, model);
    return model;
  }

  private getRoot(): Promise<ICertificateModel> {
    return this.storage.get(this.rootKey);
  }

  /**
   * 为指定域名创建证书 (使用自定义的根证书)
   */
  private async create(host: string): Promise<ICertificateModel> {
    const rootModel = await this.getRoot();
    const res = await pemCreateCertificate({
      altNames: [host],
      commonName: host,
      days: 365 * 10,
      serviceCertificate: rootModel.cert,
      serviceKey: rootModel.key,
    });
    return {
      cert: res.certificate,
      key: res.clientKey,
    };
  }
}

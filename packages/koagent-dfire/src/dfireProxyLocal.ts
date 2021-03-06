import events from 'events';
import Koa from 'koa';
import _ from 'lodash';
import Configstore from 'configstore';
import compose from 'koa-compose';
import koagentHttpProxy from 'koagent-http-proxy';

const regx = /^\/([^/]+)\/([^/]+)\/(.*)?$/;

const defaultProjectsPort = {
  marketing: 8085,
  shop: 8086,
  om: 8087,
  meal: 8088,
  bill: 8089,
  retail: 8090,
  'presell-activity': 8092,
  'presell-shop': 8093,
  'presell-om': 8094,
};

const localDomain = 'http://localhost';

const remoteServerDomins = {
  pre: 'http://meal.2dfire-pre.com',
  publish: 'http://meal.2dfire.com',
};

const remoteStaticDomins = {
  dev: 'http://api.l.whereask.com',
  pre: 'http://d.2dfire-pre.com',
  publish: 'http://d.2dfire.com',
};

const getRmoteUrl = ({ branch, projectName, otherPath }) => {
  if (branch === 'pre' || branch === 'publish') {
    if (projectName === 'api') {
      return `${remoteServerDomins[branch]}/${otherPath}`;
    }
    return `${remoteStaticDomins[branch]}/${projectName}/${otherPath}`;
  }
  return `${remoteStaticDomins.dev}/${branch}/${projectName}/${otherPath}`;
};

const getLocalUrl = ({ otherPath }, port) => {
  return `${localDomain}:${port}/${otherPath}`;
};

interface Project {
  name: string;
  localPort: number;
  desc?: string;
}

export default class DifreProxyLocalMananger extends events.EventEmitter {
  private projects: Project[] = [];
  private forwardProjects: string[] = [];
  private configStore: Configstore;
  constructor() {
    super();
    this.resetProjects();
    this.configStore = new Configstore('koagent-dfire', {
      forwardProjects: this.forwardProjects,
    });
    this.restore();
  }
  needForward(projectName) {
    return this.forwardProjects.indexOf(projectName) !== -1;
  }
  addForward(projectName) {
    if (!this.needForward(projectName)) {
      this.forwardProjects.push(projectName);
      this.emit('addForward', projectName);
      this.store();
    }
  }
  removeForward(projectName) {
    if (this.needForward(projectName)) {
      this.forwardProjects = this.forwardProjects
        .filter(vo => vo !== projectName);
      this.emit('removeForward', projectName);
      this.store();
    }
  }
  restore() {
    this.forwardProjects = this.configStore.get('forwardProjects');
  }
  store() {
    this.emit('storing');
    this.configStore.set('forwardProjects', this.forwardProjects);
    this.emit('stored');
  }
  match(path: string) {
    const res = path.match(regx);
    if (!res) {
      throw new Error(`path: "${path}" 不是一个有效的地址`);
    }
    const [, branch, projectName, otherPath] = res;
    const options = {
      branch, projectName, otherPath,
    };
    const project = this.projects.find(vo => vo.name === projectName);
    if (project && this.needForward(projectName)) {
      return getLocalUrl(options, project.localPort);
    }
    return getRmoteUrl(options);
  }
  private resetProjects () {
    this.projects = _.map(defaultProjectsPort, (localPort, name) => ({
      localPort,
      name,
    }));
  }
  public getProjects() {
    return this.projects.map(vo => ({
      ...vo,
      needForward: this.needForward(vo.name),
    }));
  }
  public forward() {
    return compose([
      (ctx: Koa.Context, next) => {
        const targetUrl = this.match(ctx.url);
        this.emit('forward', {
          from: ctx.url,
          target: targetUrl,
        });
        ctx.req.url = targetUrl;
        return next();
      },
      koagentHttpProxy(),
    ]);
  }
}

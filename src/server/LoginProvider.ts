import * as url from "url";
import * as SAMLStrategy from "passport-saml";
import * as passport from "passport";
import { Config } from "./Config";
import * as winston from "winston";
import * as express from "express";
import * as bodyparser from "body-parser";

const https = require('https');

function httpsPost({ body, ...options }) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            method: 'POST',
            ...options,
        }, res => {
            const chunks = [];
            res.on('data', data => chunks.push(data))
            res.on('end', () => {
                let body = Buffer.concat(chunks);
                switch (res.headers['content-type']) {
                    case 'application/json':
                        body = JSON.parse(body.toString());
                        break;
                }
                resolve(body)
            })
        })
        req.on('error', (a1, a2) => {
            if (a1.message) { return reject(a1.message); }
            reject(a1);
        });
        if (body) {
            req.write(body);
        }
        req.end();
    })
}

interface IVerifyFunction { (error: any, profile: any): void; }
export class Provider {
    public provider: string = "";
    public id: string = "";
    public name: string = "";
    public issuer: string = "";
    public saml_federation_metadata: string = "";
    public consumerKey: string;
    public consumerSecret: string;
}

// tslint:disable-next-line: class-name
export class samlauthstrategyoptions {
    public callbackUrl: string = "auth/strategy/callback/";
    public logoutUrl: string = "";
    public entryPoint: string = "";
    public issuer: string = "";
    public cert: string = null;

    public audience: string = null;
    public signatureAlgorithm: string = "sha256";
    public callbackMethod: string = "POST";
    public verify: any;
}
export class LoginProvider {
    private static _logger: winston.Logger;
    private static samlStrategy: any;

    static async isLoggedIn(req: any, res: any, next: any) {
        if (req.isAuthenticated())
            return next();
        if (req.originalUrl !== "/jwt") {
            res.cookie("originalUrl2", req.originalUrl, { maxAge: 900000, httpOnly: true });
        }
        res.redirect('/saml');
    }

    static async configure(logger: winston.Logger, app: express.Express, baseurl: string): Promise<void> {
        this._logger = logger;
        app.use(passport.initialize());
        app.use(passport.session());
        passport.serializeUser(async function (user: any, done: any): Promise<void> {
            done(null, user);
        });
        passport.deserializeUser(function (user: any, done: any): void {
            done(null, user);
        });

        app.get("/Signout", (req: any, res: any, next: any): void => {
            try {
                this.samlStrategy.logout(req, function (err, requestUrl) {
                    // LOCAL logout
                    req.logout();
                    // redirect to the IdP with the encrypted SAML logout request
                    res.redirect(requestUrl);
                });
            } catch (error) {
                req.logout();
                res.redirect("/");
            }
        });

        await LoginProvider.RegisterProviders(app, baseurl);
        app.get("/config", (req: any, res: any, next: any): void => {
            var baseurl: string = Config.saml_federation_metadata;
            var _wsurl: string = "";
            var _loginurl: string = "";
            var _url: string = Config.baseurl();
            if (url.parse(baseurl).protocol == "http:") {
                _wsurl = "ws://" + url.parse(baseurl).host;
                _loginurl = "http://" + url.parse(baseurl).host;
            } else {
                _wsurl = "wss://" + url.parse(baseurl).host;
                _loginurl = "https://" + url.parse(baseurl).host;
            }
            _wsurl += "/";
            var res2 = {
                wsurl: _wsurl,
                loginurl: _loginurl,
                wshost: _wsurl,
                url: _url,
                version: Config.version
            }
            res.end(JSON.stringify(res2));
        });
        // app.get("/jwt", (req: any, res: any, next: any): void => {
        //     LoginProvider.isLoggedIn(req, res, next);
        // });
        app.get("/jwt", async (req: any, res: any, next: any): Promise<void> => {
            try {
                var up = url.parse(Config.saml_federation_metadata);
                var res2 = { rawAssertion: req.user.token2 };
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(res2));
            } catch (error) {
                res.setHeader("Content-Type", "application/json");
                if (error.message != undefined) {
                    res.end(JSON.stringify({ error: error.message, jwt: "", rawAssertion: "" }));
                } else {
                    res.end(JSON.stringify({ error: error, jwt: "", rawAssertion: "" }));
                }

            }
        });
        app.get("/failimpersonate", async (req: any, res: any, next: any): Promise<void> => {
            if (req.isAuthenticated()) {
                // res.send("<html><head></head><body><h1>Impersonation failed</h1>Efterligning mislykkedes<br><p><a href='/'>Tilbage</a></p></body></html>");
                res.send("<html><head></head><body><h1>Impersonation failed</h1>Efterligning mislykkedes<br><p><a href='/logout'>Log ind igen</a></p></body></html>");
            } else {
                res.redirect("/");
            }
        });

    }
    static async RegisterProviders(app: express.Express, baseurl: string) {
        var metadata: any = await Config.parse_federation_metadata(Config.saml_federation_metadata);
        this.samlStrategy = LoginProvider.CreateSAMLStrategy(app, "saml", metadata.cert,
            metadata.identityProviderUrl, Config.saml_issuer, baseurl);
    }

    // tslint:disable-next-line: max-line-length
    static CreateSAMLStrategy(app: express.Express, key: string, cert: string, singin_url: string, issuer: string, baseurl: string): passport.Strategy {
        var strategy: passport.Strategy = null;
        var options: samlauthstrategyoptions = new samlauthstrategyoptions();
        options.entryPoint = singin_url;
        options.cert = cert;
        options.issuer = issuer;
        (options as any).acceptedClockSkewMs = 5000;
        options.callbackUrl = url.parse(baseurl).protocol + "//" + url.parse(baseurl).host + "/" + key + "/";
        options.logoutUrl = url.parse(singin_url).protocol + "//" + url.parse(singin_url).host + "/logout/";
        options.verify = (LoginProvider.samlverify).bind(this);
        strategy = new SAMLStrategy.Strategy(options as any, options.verify);
        passport.use(key, strategy);
        strategy.name = key;
        this._logger.info(options.callbackUrl);

        app.use("/" + key,
            bodyparser.urlencoded({ extended: false }),
            passport.authenticate(key, { failureRedirect: "/" + key, failureFlash: true }),
            function (req: any, res: any): void {
                var originalUrl2: any = req.cookies.originalUrl2;
                if (originalUrl2 !== undefined && originalUrl2 !== null) {
                    res.cookie("originalUrl2", "", { expires: new Date() });
                    res.redirect(originalUrl2);
                } else {
                    res.redirect("/");
                }
            }
        );
        return strategy;
    }

    static async samlverify(profile: any, done: IVerifyFunction): Promise<void> {
        if (profile !== null && profile !== undefined) {
            profile.token2 = profile.getAssertionXml();
        }
        done(null, profile);
    }

}
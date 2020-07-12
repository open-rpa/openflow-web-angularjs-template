import * as path from "path";
import * as winston from "winston";
import * as http from "http";
import * as https from "https";
import * as express from "express";
import * as compression from "compression";
import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as session from "express-session";

import { LoginProvider } from "./LoginProvider";
import { Config } from "./Config";

export class WebServer {
    private static _logger: winston.Logger;
    private static app: express.Express;

    static async configure(logger: winston.Logger, baseurl: string): Promise<http.Server> {
        this._logger = logger;

        this.app = express();
        this.app.use(cookieParser());
        this.app.use(session({ secret: 'secrettexthere' }));
        this.app.use(compression());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.json());

        this.app.use("/", express.static(path.join(__dirname, "..", "/public")));
        this.app.use("/android", express.static(path.join(__dirname, "..", "/public")));
        this.app.use("/ios", express.static(path.join(__dirname, "..", "/public")));
        await LoginProvider.configure(this._logger, this.app, baseurl);
        var server: http.Server = null;
        if (Config.tls_crt != '' && Config.tls_key != '') {
            var options: any = {
                cert: Config.tls_crt,
                key: Config.tls_key
            };
            if (Config.tls_crt.indexOf("---") == -1) {
                options = {
                    cert: Buffer.from(Config.tls_crt, 'base64').toString('ascii'),
                    key: Buffer.from(Config.tls_key, 'base64').toString('ascii')
                    // requestCert: true
                };
            }
            var ca: string = Config.tls_ca;
            if (ca !== "") {
                if (ca.indexOf("---") === -1) {
                    ca = Buffer.from(Config.tls_ca, 'base64').toString('ascii');
                }
                // options.cert += "\n" + ca;
                options.ca += ca;
            }
            if (Config.tls_passphrase !== "") {
                // options.cert = [options.cert, Config.tls_passphrase];
                // options.key = [options.key, Config.tls_passphrase];
                options.passphrase = Config.tls_passphrase;
            }
            server = https.createServer(options, this.app);
        } else {
            server = http.createServer(this.app);
        }


        server.listen(Config.port);
        return server;
    }
}
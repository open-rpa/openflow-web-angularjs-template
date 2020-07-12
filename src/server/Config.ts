import { fetch, toPassportConfig } from "passport-saml-metadata";
import * as retry from "async-retry";
import * as https from "https";
import * as fs from "fs";
export class Config {
    public static version: string = fs.readFileSync("VERSION", "utf8");
    public static tls_crt: string = Config.getEnv("tls_crt", "");
    public static tls_key: string = Config.getEnv("tls_key", "");
    public static tls_ca: string = Config.getEnv("tls_ca", "");
    public static tls_passphrase: string = Config.getEnv("tls_passphrase", "");

    public static port: number = parseInt(Config.getEnv("port", "3000"));
    public static saml_federation_metadata: string = Config.getEnv("saml_federation_metadata", "");
    public static saml_issuer: string = Config.getEnv("saml_issuer", "");
    public static saml_entrypoint: string = Config.getEnv("saml_entrypoint", "");
    public static saml_crt: string = Config.getEnv("saml_crt", "");
    public static protocol: string = Config.getEnv("protocol", "http");

    public static frontend_domain: string = Config.getEnv("frontend_domain", "localhost");

    public static baseurl(): string {
        // if (Config.tls_crt != '' && Config.tls_key != '') {
        //     return "https://" + Config.frontend_domain + ":" + Config.port + "/";
        // }
        // return "http://" + Config.frontend_domain + ":" + Config.port + "/";
        var result: string = "";
        if (Config.tls_crt != '' && Config.tls_key != '') {
            result = "https://" + Config.frontend_domain;
        } else {
            result = Config.protocol + "://" + Config.frontend_domain;
        }
        if (Config.port != 80 && Config.port != 443) {
            result = result + ":" + Config.port + "/";
        } else { result = result + "/"; }
        return result;
    }
    public static getEnv(name: string, defaultvalue: string): string {
        var value: any = process.env[name];
        if (!value || value === "") { value = defaultvalue; }
        return value;
    }
    public static async parse_federation_metadata(url: string): Promise<any> {
        // if anything throws, we retry
        // rootCas.addFile(path.join(__dirname, '../config/ssl/gd_bundle-g2-g1.crt'));
        if (Config.tls_ca !== "") {
            var tls_ca: string = Buffer.from(Config.tls_ca, 'base64').toString('ascii')
            var rootCas = require('ssl-root-cas/latest').create();
            rootCas.push(tls_ca);
            // rootCas.addFile( tls_ca );
            https.globalAgent.options.ca = rootCas;
            require('https').globalAgent.options.ca = rootCas;
        }

        var metadata: any = await retry(async bail => {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
            var reader: any = await fetch({ url });
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
            if (reader === null || reader === undefined) { bail(new Error("Failed getting result")); return; }
            var config: any = toPassportConfig(reader);
            // we need this, for Office 365 :-/
            if (reader.signingCerts && reader.signingCerts.length > 1) {
                config.cert = reader.signingCerts;
            }
            return config;
        }, {
            retries: 50,
            onRetry: function (error: Error, count: number): void {
                console.debug("retry " + count + " error " + error.message + " getting " + url);
            }
        });
        return metadata;
    }
}

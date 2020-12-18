import * as winston from "winston";
import * as http from "http";
import { Logger } from "./Logger";
import { WebServer } from "./WebServer";
import { Config } from "./Config";


const logger: winston.Logger = Logger.configure();

(async function (): Promise<void> {
    try {
        // await Config.get_login_providers();
        const server: http.Server = await WebServer.configure(logger, Config.baseurl());
        logger.info("listening on " + Config.baseurl());
    } catch (error) {
        logger.error(error.message);
        console.error(error);
    }

})();

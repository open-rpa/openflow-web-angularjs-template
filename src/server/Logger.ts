import * as winston from "winston";

export class Logger {
    static configure(): winston.Logger {
        var options: any = {
            console: {
                level: "debug",
                handleExceptions: false,
                json: false,
                colorize: true
            },
        };
        const logger: winston.Logger = winston.createLogger({
            level: "debug",
            format: winston.format.json(),
            defaultMeta: { service: "aiot-frontend" },
            transports: [
                new winston.transports.Console(options.console)
            ]
        });
        return logger;
    }
}
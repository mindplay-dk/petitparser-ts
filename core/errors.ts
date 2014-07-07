module petitparser.error {
    
    export function completedParser(error: Error): Error {
        error.message = 'Completed Parser';
        return error;
    }
    
    export function undefinedProduction(error: Error, name: string): Error {
        error.message = 'Undefined production: ' + name;
        return error;
    }
    
    export function redefinedProduction(error: Error, name: string): Error {
        error.message = 'Redefined production: ' + name;
        return error;
    }
    
    export function parserError(error: Error, failure: Failure): Error {
        error.message = failure._message + ' at ' + failure.toPositionString(); 
        return error;
    }

    export function argumentError(error: Error, message: string): Error {
        error.message = 'Invalid Argument: ' + message;
        return error;
    }
}

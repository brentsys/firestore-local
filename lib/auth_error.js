"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class AuthError extends Error {
    constructor(status = 401, ...params) {
        // Passer les arguments restants (incluant ceux spécifiques au vendeur) au constructeur parent
        super(...params);
        // Informations de déboguage personnalisées
        this.status = status;
    }
    static reject(message, status = 404) {
        return Promise.reject(new AuthError(status, message));
    }
    static send(error, status = 422) {
        return function (res) {
            return res.status(status).send(error.message);
        };
    }
    ;
}
exports.AuthError = AuthError;
class NoAuthError extends AuthError {
    constructor(authRequested) {
        // Passer les arguments restants (incluant ceux spécifiques au vendeur) au constructeur parent
        super(428, 'No Authorizations set by endUser');
        // Informations de déboguage personnalisées
        this.authRequested = authRequested;
        this.type = 'NoAuthError';
    }
}
exports.NoAuthError = NoAuthError;

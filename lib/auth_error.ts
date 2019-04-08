export class AuthError extends Error {
    status: number
    constructor (status = 401, ...params) {
      // Passer les arguments restants (incluant ceux spécifiques au vendeur) au constructeur parent
      super(...params);
      // Informations de déboguage personnalisées
      this.status = status;
    }
  
    static reject(message:string, status: number = 404):Promise<any>{
      return Promise.reject(new AuthError(status, message));
    }
  
    static send(error, status = 422) {
      return function (res) {
        return res.status(status).send(error.message);
      };
    };
  
  }
  
  export class NoAuthError extends AuthError {
    authRequested: any
    type: string
    constructor (authRequested) {
      // Passer les arguments restants (incluant ceux spécifiques au vendeur) au constructeur parent
      super(428, 'No Authorizations set by endUser');
      // Informations de déboguage personnalisées
      this.authRequested = authRequested;
      this.type = 'NoAuthError';
    }
  }
  
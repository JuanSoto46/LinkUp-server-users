import { baseDAO } from "./baseDAO";


class UserDAO extends baseDAO {
    constructor() {
        super('users');
    }
    
}

export const userDAO = new UserDAO();

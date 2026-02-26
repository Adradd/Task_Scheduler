package app.CalendarApp.service;

import app.CalendarApp.repository.Account;

public interface AccountService {
    Account findAccountByAccountId(String accountId);
    Account findAccountByUsername(String username);
    Account findAccountByEmail(String email);
    Account createAccount(Account account);
    Account updateAccount(Account account);
    void deleteAccount(String accountId);
}


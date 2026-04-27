package app.CalendarApp.service;

import app.CalendarApp.repository.Account;

/**
 * Service contract for account lookup, creation, profile updates, and deletion.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
public interface AccountService {
    /**
     * Finds an account by its stored account identifier.
     *
     * @param accountId account identifier
     * @return matching account or null
     */
    Account findAccountByAccountId(String accountId);

    /**
     * Finds an account by username.
     *
     * @param username username to search for
     * @return matching account or null
     */
    Account findAccountByUsername(String username);

    /**
     * Finds an account by email address.
     *
     * @param email email address to search for
     * @return matching account or null
     */
    Account findAccountByEmail(String email);

    /**
     * Validates, encodes, and persists a new account.
     *
     * @param account account to create
     * @return saved account
     */
    Account createAccount(Account account);

    /**
     * Validates and persists changes to an existing account.
     *
     * @param account account to update
     * @return saved account
     */
    Account updateAccount(Account account);

    /**
     * Deletes an account by identifier.
     *
     * @param accountId account identifier to delete
     */
    void deleteAccount(String accountId);
}

package app.CalendarApp.service.impl;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.AccountRepository;
import app.CalendarApp.service.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

@Service
public class AccountServiceImpl implements AccountService {
    private final AccountRepository accountRepository;
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[\\w-.]+@([\\w-]+\\.)+[\\w-]{2,4}$");

    @Autowired
    public AccountServiceImpl(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Override
    public Account findAccountByAccountId(String accountId) {
        return accountRepository.findAccountByAccountId(accountId);
    }

    @Override
    public Account findAccountByUsername(String username) {
        return accountRepository.findAccountByUsername(username);
    }

    @Override
    public Account findAccountByEmail(String email) {
        return accountRepository.findAccountByEmail(email);
    }

    @Override
    public Account createAccount(Account account) {
        validateAccount(account, false);
        return accountRepository.save(account);
    }

    @Override
    public Account updateAccount(Account account) {
        if (account.getId() == null || accountRepository.findAccountByAccountId(account.getId()) == null) {
            throw new IllegalArgumentException("Account does not exist");
        }
        validateAccount(account, true);
        return accountRepository.save(account);
    }

    @Override
    public void deleteAccount(String accountId) {
        if (accountId == null || accountRepository.findAccountByAccountId(accountId) == null) {
            throw new IllegalArgumentException("Account does not exist");
        }
        accountRepository.deleteById(accountId);
    }

    private void validateAccount(Account account, boolean isUpdate) {
        if (account.getUsername() == null || account.getUsername().trim().isEmpty()) {
            throw new IllegalArgumentException("Username is required");
        }
        if (account.getEmail() == null || account.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (!EMAIL_PATTERN.matcher(account.getEmail()).matches()) {
            throw new IllegalArgumentException("Invalid email format");
        }
        if (!isUpdate && accountRepository.findAccountByUsername(account.getUsername()) != null) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (!isUpdate && accountRepository.findAccountByEmail(account.getEmail()) != null) {
            throw new IllegalArgumentException("Email already exists");
        }
        if (account.getPassword() == null || account.getPassword().length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }
    }
}

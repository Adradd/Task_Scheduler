package app.CalendarApp.service.impl;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.AccountRepository;
import app.CalendarApp.repository.GoogleCalendarProjectMappingRepository;
import app.CalendarApp.repository.ProjectRepository;
import app.CalendarApp.repository.TagRepository;
import app.CalendarApp.repository.TaskRepository;
import app.CalendarApp.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.regex.Pattern;

/**
 * Implements account validation, password encoding, persistence, and cascading
 * cleanup of user-owned data.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final TaskRepository taskRepository;
    private final TagRepository tagRepository;
    private final ProjectRepository projectRepository;
    private final GoogleCalendarProjectMappingRepository mappingRepository;
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[\\w-.]+@([\\w-]+\\.)+[\\w-]{2,4}$");

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
        account.setPassword(passwordEncoder.encode(account.getPassword()));
        account.setDateCreated(LocalDate.now().toString());
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
        Account existingAccount = accountId == null ? null : accountRepository.findAccountByAccountId(accountId);
        if (existingAccount == null) {
            throw new IllegalArgumentException("Account does not exist");
        }

        taskRepository.deleteAllByOwner(existingAccount);
        tagRepository.deleteAllByOwner(existingAccount);
        projectRepository.deleteAllByOwner(existingAccount);
        mappingRepository.deleteAllByAccountId(accountId);
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
        if (account.getRole() == null || account.getRole().isBlank()) {
            account.setRole("user");
        }
        if (!isUpdate && accountRepository.findAccountByUsername(account.getUsername()) != null) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (!isUpdate && accountRepository.findAccountByEmail(account.getEmail()) != null) {
            throw new IllegalArgumentException("Email already exists");
        }
        // Only validate password on account creation, not on update
        if (!isUpdate && (account.getPassword() == null || account.getPassword().length() < 8)) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }

        if (account.getStartWorkingHours() != null && !account.getStartWorkingHours().isBlank()
            && account.getEndWorkingHours() != null && !account.getEndWorkingHours().isBlank()) {
            LocalTime start;
            LocalTime end;
            try {
                start = LocalTime.parse(account.getStartWorkingHours());
                end = LocalTime.parse(account.getEndWorkingHours());
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException("Invalid working hour format");
            }
            if (!end.isAfter(start)) {
                throw new IllegalArgumentException("End working hours must be after start working hours");
            }
        }
    }
}

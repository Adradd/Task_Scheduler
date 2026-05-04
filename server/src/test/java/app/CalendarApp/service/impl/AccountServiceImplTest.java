package app.CalendarApp.service.impl;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.AccountRepository;
import app.CalendarApp.repository.GoogleCalendarProjectMappingRepository;
import app.CalendarApp.repository.ProjectRepository;
import app.CalendarApp.repository.TagRepository;
import app.CalendarApp.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountServiceImplTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private TagRepository tagRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private GoogleCalendarProjectMappingRepository mappingRepository;

    @InjectMocks
    private AccountServiceImpl accountService;

    private Account account;

    @BeforeEach
    void setUp() {
        account = new Account("acc-1", "jane", "password123", "jane@example.com", null, "09:00", "17:00");
    }

    @Test
    void createAccountEncodesPasswordAndSetsDateCreated() {
        when(passwordEncoder.encode("password123")).thenReturn("encoded");
        when(accountRepository.save(any(Account.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Account created = accountService.createAccount(account);

        ArgumentCaptor<Account> captor = ArgumentCaptor.forClass(Account.class);
        verify(accountRepository).save(captor.capture());
        assertEquals("encoded", created.getPassword());
        assertEquals(LocalDate.now().toString(), created.getDateCreated());
        assertEquals("encoded", captor.getValue().getPassword());
    }

    @Test
    void createAccountRejectsDuplicateUsername() {
        when(accountRepository.findAccountByUsername("jane")).thenReturn(new Account("other", "jane", "password123", "taken@example.com", null, "09:00", "17:00"));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> accountService.createAccount(account));

        assertEquals("Username already exists", exception.getMessage());
    }

    @Test
    void createAccountRejectsDuplicateEmail() {
        when(accountRepository.findAccountByEmail("jane@example.com")).thenReturn(new Account("other", "other", "password123", "jane@example.com", null, "09:00", "17:00"));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> accountService.createAccount(account));

        assertEquals("Email already exists", exception.getMessage());
    }

    @Test
    void createAccountRejectsInvalidEmailFormat() {
        account.setEmail("not-an-email");

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> accountService.createAccount(account));

        assertEquals("Invalid email format", exception.getMessage());
    }

    @Test
    void createAccountRejectsShortPassword() {
        account.setPassword("short");

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> accountService.createAccount(account));

        assertEquals("Password must be at least 8 characters", exception.getMessage());
    }

    @Test
    void createAccountRejectsInvalidWorkingHourRange() {
        account.setStartWorkingHours("17:00");
        account.setEndWorkingHours("09:00");

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> accountService.createAccount(account));

        assertEquals("End working hours must be after start working hours", exception.getMessage());
    }

    @Test
    void updateAccountSucceedsForExistingAccount() {
        account.setId("acc-1");
        when(accountRepository.findAccountByAccountId("acc-1")).thenReturn(account);
        when(accountRepository.save(account)).thenReturn(account);

        Account updated = accountService.updateAccount(account);

        assertSame(account, updated);
    }

    @Test
    void updateAccountRejectsInvalidWorkingHourRange() {
        account.setId("acc-1");
        account.setStartWorkingHours("18:00");
        account.setEndWorkingHours("18:00");
        when(accountRepository.findAccountByAccountId("acc-1")).thenReturn(account);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> accountService.updateAccount(account));

        assertEquals("End working hours must be after start working hours", exception.getMessage());
    }

    @Test
    void updateAccountRejectsMissingAccount() {
        account.setId("missing");

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> accountService.updateAccount(account));

        assertEquals("Account does not exist", exception.getMessage());
    }

    @Test
    void deleteAccountRejectsMissingAccount() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> accountService.deleteAccount("missing"));

        assertEquals("Account does not exist", exception.getMessage());
        verify(taskRepository, never()).deleteAllByOwner(any(Account.class));
        verify(tagRepository, never()).deleteAllByOwner(any(Account.class));
        verify(projectRepository, never()).deleteAllByOwner(any(Account.class));
        verify(mappingRepository, never()).deleteAllByAccountId(any(String.class));
    }

    @Test
    void deleteAccountRemovesAssociatedDataBeforeAccount() {
        when(accountRepository.findAccountByAccountId("acc-1")).thenReturn(account);

        accountService.deleteAccount("acc-1");

        verify(taskRepository).deleteAllByOwner(account);
        verify(tagRepository).deleteAllByOwner(account);
        verify(projectRepository).deleteAllByOwner(account);
        verify(mappingRepository).deleteAllByAccountId("acc-1");
        verify(accountRepository).deleteById("acc-1");
    }
}

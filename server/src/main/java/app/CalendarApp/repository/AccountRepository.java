package app.CalendarApp.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

/**
 * Mongo repository for account documents and lookup helpers used by login and
 * account management flows.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
public interface AccountRepository extends MongoRepository<Account, String> {

    @Query("{accountId: ?0}")
    Account findAccountByAccountId(String id);

    @Query("{username: ?0}")
    Account findAccountByUsername(String username);

    @Query("{email: ?0}")
    Account findAccountByEmail(String email);

    long count();
}

package app.CalendarApp.service;

import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

/**
 * Delegates OAuth2 user loading to Spring's default implementation while
 * keeping the application wired for OAuth login customization.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
@Service
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();

    /**
     * Loads an OAuth2 user from the provider using the default Spring delegate.
     *
     * @param userRequest OAuth2 user request
     * @return OAuth2 user principal
     * @throws OAuth2AuthenticationException when provider user loading fails
     */
    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        return delegate.loadUser(userRequest);
    }
}

# Privacy

Contributor Compass has no backend, analytics, account sign-in, access tokens, or private repository support.

While the panel is open and following, it reads the active tab's GitHub URL to identify the repository. It requests public repository information from api.github.com. GitHub receives these ordinary API requests and the network information normally accompanying them. Cookies and authorization credentials are not sent by the extension.

Tab URLs and browsing history are not persisted. Up to 25 public repository reports are cached locally. Reports are fresh for 15 minutes; dated cached results may be shown for up to seven days when GitHub is unavailable. Use **Clear cached reports** to erase cached reports. Uninstalling removes extension storage. Fonts and decorative assets are bundled locally.

Permissions: `sidePanel` opens the interface; `activeTab` permits the user-triggered current-tab context; `storage` caches public reports. Host access is limited to github.com for active repository detection and api.github.com for public data. No content script modifies GitHub pages.

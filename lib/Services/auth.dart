// Keeps the JWT returned by /login and builds authenticated request headers.
// The token lives in memory only, so closing the app logs the user out.
class AuthService {
  static const String baseUrl = 'http://10.0.2.2:3000'; // Android emulator -> host machine
  static String? token;

  static bool get isLoggedIn => token != null;

  static Map<String, String> headers() => <String, String>{
        'Content-Type': 'application/json; charset=UTF-8',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  static void logout() => token = null;
}

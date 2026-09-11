import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';

enum UserRole { vendor, customer }

class AuthState {
  final bool isAuthenticated;
  final String userId;
  final String userName;
  final String businessName;
  final UserRole role;
  final String phone;
  final String? token;
  final bool isLoading;
  final String? errorMessage;

  const AuthState({
    this.isAuthenticated = true,
    this.userId = '7bfe1d98-2a64-406f-92c2-4878aa854df9',
    this.userName = 'Ramesh Fresh Vegetables',
    this.businessName = 'ರಮೇಶ್ ತಾಜಾ ತರಕಾರಿಗಳು',
    this.role = UserRole.vendor,
    this.phone = '9876543210',
    this.token = 'real_jwt_ramesh_session',
    this.isLoading = false,
    this.errorMessage,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    String? userId,
    String? userName,
    String? businessName,
    UserRole? role,
    String? phone,
    String? token,
    bool? isLoading,
    String? errorMessage,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      userId: userId ?? this.userId,
      userName: userName ?? this.userName,
      businessName: businessName ?? this.businessName,
      role: role ?? this.role,
      phone: phone ?? this.phone,
      token: token ?? this.token,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState());

  Future<bool> login(String phone, String pin) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final res = await ApiClient.login(phone, pin);
    state = state.copyWith(isLoading: false);

    if (res['success'] == true && res['data'] != null) {
      final data = res['data'];
      final roleStr = data['role'] ?? (data['vendor_id'] != null ? 'VENDOR' : 'CUSTOMER');
      final isVendor = roleStr == 'VENDOR';

      state = AuthState(
        isAuthenticated: true,
        userId: data['vendor_id'] ?? data['customer_id'] ?? '7bfe1d98-2a64-406f-92c2-4878aa854df9',
        userName: data['name'] ?? (isVendor ? 'Ramesh Fresh Vegetables' : 'Priya Sharma'),
        businessName: data['business_name'] ?? (isVendor ? 'ರಮೇಶ್ ತಾಜಾ ತರಕಾರಿಗಳು' : 'Priya Residence'),
        role: isVendor ? UserRole.vendor : UserRole.customer,
        phone: phone,
        token: data['access_token'] ?? 'jwt_token',
      );
      return true;
    } else {
      state = state.copyWith(errorMessage: 'Invalid phone or PIN');
      return false;
    }
  }

  void switchAccount(String accountType) {
    if (accountType == 'RAMESH') {
      state = const AuthState(
        isAuthenticated: true,
        userId: '7bfe1d98-2a64-406f-92c2-4878aa854df9',
        userName: 'Ramesh Fresh Vegetables',
        businessName: 'ರಮೇಶ್ ತಾಜಾ ತರಕಾರಿಗಳು',
        role: UserRole.vendor,
        phone: '9876543210',
        token: 'real_jwt_ramesh_session',
      );
      ApiClient.currentVendorId = '7bfe1d98-2a64-406f-92c2-4878aa854df9';
      ApiClient.currentRole = 'VENDOR';
    } else if (accountType == 'MANJUNATH') {
      state = const AuthState(
        isAuthenticated: true,
        userId: 'vendor-manjunath-fruits',
        userName: 'Manjunath Seasonal Fruits',
        businessName: 'ಮಂಜುನಾಥ್ ಹಣ್ಣಿನ ಅಂಗಡಿ',
        role: UserRole.vendor,
        phone: '9876543211',
        token: 'real_jwt_manjunath_session',
      );
      ApiClient.currentVendorId = 'vendor-manjunath-fruits';
      ApiClient.currentRole = 'VENDOR';
    } else {
      state = const AuthState(
        isAuthenticated: true,
        userId: 'cust-priya-sharma',
        userName: 'Priya Sharma',
        businessName: '#42, 3rd Cross, Gandhi Nagar, Bengaluru',
        role: UserRole.customer,
        phone: '9876543220',
        token: 'real_jwt_priya_session',
      );
      ApiClient.currentRole = 'CUSTOMER';
    }
  }

  void logout() {
    state = const AuthState(
      isAuthenticated: false,
      userId: '',
      userName: '',
      businessName: '',
      token: null,
    );
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

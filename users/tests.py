from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Company
from community.models import CuratedList, Recommendation

from .models import BusinessClaim, PersonalProfile

User = get_user_model()


class UserRegistrationTests(APITestCase):
    def test_register_supports_personal_account_type(self):
        response = self.client.post(
            reverse("users:register"),
            {
                "email": "reader@example.com",
                "password": "supersecure123",
                "first_name": "Reader",
                "last_name": "One",
                "display_name": "Reader",
                "account_type": User.AccountType.PERSONAL,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["account_type"], User.AccountType.PERSONAL)
        self.assertEqual(response.data["display_name"], "Reader")
        self.assertTrue(
            PersonalProfile.objects.filter(user__email="reader@example.com").exists()
        )

    def test_register_supports_business_account_type(self):
        response = self.client.post(
            reverse("users:register"),
            {
                "email": "owner@example.com",
                "password": "supersecure123",
                "first_name": "Owner",
                "last_name": "One",
                "display_name": "Owner",
                "account_type": User.AccountType.BUSINESS,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["account_type"], User.AccountType.BUSINESS)

    def test_register_generates_public_slug(self):
        response = self.client.post(
            reverse("users:register"),
            {
                "email": "reader@example.com",
                "password": "supersecure123",
                "first_name": "Reader",
                "last_name": "One",
                "display_name": "Reader One",
                "account_type": User.AccountType.PERSONAL,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["public_slug"], "reader-one")


class MeViewTests(APITestCase):
    def test_me_includes_business_verification_fields(self):
        user = User.objects.create_user(
            email="owner@example.com",
            password="supersecure123",
            account_type=User.AccountType.BUSINESS,
        )
        company = Company.objects.create(name="North Star")
        BusinessClaim.objects.create(
            user=user,
            company=company,
            business_name="North Star",
            business_email="owner@northstar.com",
            status=BusinessClaim.VerificationStatus.PENDING,
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("users:me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["account_type"], User.AccountType.BUSINESS)
        self.assertFalse(response.data["is_business_verified"])
        self.assertEqual(response.data["verification_status"], BusinessClaim.VerificationStatus.PENDING)

    def test_me_does_not_allow_account_type_changes(self):
        user = User.objects.create_user(
            email="reader@example.com",
            password="supersecure123",
            account_type=User.AccountType.PERSONAL,
        )
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            reverse("users:me"),
            {"account_type": User.AccountType.BUSINESS, "display_name": "Reader"},
            format="json",
        )

        user.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(user.account_type, User.AccountType.PERSONAL)
        self.assertEqual(user.display_name, "Reader")


class TokenViewTests(APITestCase):
    token_url = reverse("token_obtain_pair")

    def test_personal_login_returns_user_payload(self):
        user = User.objects.create_user(
            email="reader@example.com",
            password="supersecure123",
            first_name="Reader",
            account_type=User.AccountType.PERSONAL,
        )

        response = self.client.post(
            self.token_url,
            {"email": user.email, "password": "supersecure123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["account_type"], User.AccountType.PERSONAL)
        self.assertFalse(response.data["user"]["is_business_verified"])
        self.assertIsNone(response.data["user"]["verification_status"])

    def test_pending_business_login_returns_pending_status(self):
        user = User.objects.create_user(
            email="owner@example.com",
            password="supersecure123",
            account_type=User.AccountType.BUSINESS,
        )
        company = Company.objects.create(name="Sunbeam Books")
        BusinessClaim.objects.create(
            user=user,
            company=company,
            business_name="Sunbeam Books",
            business_email="owner@sunbeam.com",
            status=BusinessClaim.VerificationStatus.PENDING,
        )

        response = self.client.post(
            self.token_url,
            {"email": user.email, "password": "supersecure123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["account_type"], User.AccountType.BUSINESS)
        self.assertFalse(response.data["user"]["is_business_verified"])
        self.assertEqual(
            response.data["user"]["verification_status"],
            BusinessClaim.VerificationStatus.PENDING,
        )

    def test_verified_business_login_returns_verified_status(self):
        user = User.objects.create_user(
            email="owner@example.com",
            password="supersecure123",
            account_type=User.AccountType.BUSINESS,
        )
        company = Company.objects.create(name="Sunbeam Books")
        BusinessClaim.objects.create(
            user=user,
            company=company,
            business_name="Sunbeam Books",
            business_email="owner@sunbeam.com",
            status=BusinessClaim.VerificationStatus.VERIFIED,
        )

        response = self.client.post(
            self.token_url,
            {"email": user.email, "password": "supersecure123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["user"]["is_business_verified"])
        self.assertEqual(
            response.data["user"]["verification_status"],
            BusinessClaim.VerificationStatus.VERIFIED,
        )


class PersonalProfileTests(APITestCase):
    def test_personal_user_can_get_profile(self):
        user = User.objects.create_user(
            email="reader@example.com",
            password="supersecure123",
            account_type=User.AccountType.PERSONAL,
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("users:me-profile"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(PersonalProfile.objects.filter(user=user).exists())

    def test_business_user_cannot_get_personal_profile(self):
        user = User.objects.create_user(
            email="owner@example.com",
            password="supersecure123",
            account_type=User.AccountType.BUSINESS,
        )
        self.client.force_authenticate(user=user)

        response = self.client.get(reverse("users:me-profile"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_personal_profile_patch_updates_visibility(self):
        user = User.objects.create_user(
            email="reader@example.com",
            password="supersecure123",
            account_type=User.AccountType.PERSONAL,
        )
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            reverse("users:me-profile"),
            {
                "bio": "Neighborhood favorites",
                "location": "Portland, OR",
                "avatar_url": "https://example.com/avatar.jpg",
                "is_public": True,
            },
            format="json",
        )

        user.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(user.personal_profile.is_public)
        self.assertEqual(user.personal_profile.location, "Portland, OR")


class PublicProfileTests(APITestCase):
    def test_public_profile_includes_public_lists(self):
        user = User.objects.create_user(
            email="reader@example.com",
            password="supersecure123",
            account_type=User.AccountType.PERSONAL,
            display_name="Reader One",
        )
        profile = user.personal_profile
        profile.bio = "Bookstores and coffee."
        profile.is_public = True
        profile.save(update_fields=["bio", "is_public"])
        company = Company.objects.create(name="North Star Market")
        curated_list = CuratedList.objects.create(user=user, title="Weekend favorites", is_public=True)
        curated_list.items.create(company=company, position=1)

        response = self.client.get(
            reverse("users:public-profile-detail", kwargs={"public_slug": user.public_slug})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["display_name"], "Reader One")
        self.assertEqual(response.data["bio"], profile.bio)
        self.assertEqual(response.data["public_lists"][0]["title"], "Weekend favorites")

    def test_public_profile_includes_public_recommendations(self):
        user = User.objects.create_user(
            email="reader@example.com",
            password="supersecure123",
            account_type=User.AccountType.PERSONAL,
            display_name="Reader One",
        )
        profile = user.personal_profile
        profile.bio = "Bookstores and coffee."
        profile.is_public = True
        profile.save(update_fields=["bio", "is_public"])
        company = Company.objects.create(name="North Star Market")
        Recommendation.objects.create(
            user=user,
            company=company,
            title="Neighborhood staple",
            body="Warm team and consistently thoughtful selection.",
            is_public=True,
        )

        response = self.client.get(
            reverse("users:public-profile-detail", kwargs={"public_slug": user.public_slug})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["public_recommendations"][0]["title"], "Neighborhood staple")

    def test_private_profile_without_public_lists_is_hidden(self):
        user = User.objects.create_user(
            email="reader@example.com",
            password="supersecure123",
            account_type=User.AccountType.PERSONAL,
            display_name="Reader One",
        )
        profile = user.personal_profile
        profile.bio = "Hidden"
        profile.is_public = False
        profile.save(update_fields=["bio", "is_public"])

        response = self.client.get(
            reverse("users:public-profile-detail", kwargs={"public_slug": user.public_slug})
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_bio_shown_for_user_with_public_lists_and_private_profile(self):
        user = User.objects.create_user(
            email="reader@example.com",
            password="supersecure123",
            account_type=User.AccountType.PERSONAL,
            display_name="Reader One",
        )
        profile = user.personal_profile
        profile.bio = "Neighborhood coffee spots."
        profile.is_public = False
        profile.save(update_fields=["bio", "is_public"])
        company = Company.objects.create(name="Cozy Corner")
        CuratedList.objects.create(user=user, title="My picks", is_public=True).items.create(
            company=company, position=1
        )

        response = self.client.get(
            reverse("users:public-profile-detail", kwargs={"public_slug": user.public_slug})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["bio"], "Neighborhood coffee spots.")

    def test_display_name_falls_back_to_first_name_when_blank(self):
        user = User.objects.create_user(
            email="reader@example.com",
            password="supersecure123",
            account_type=User.AccountType.PERSONAL,
            first_name="Alice",
        )
        self.assertEqual(user.display_name, "")
        profile = user.personal_profile
        profile.is_public = True
        profile.save(update_fields=["is_public"])

        response = self.client.get(
            reverse("users:public-profile-detail", kwargs={"public_slug": user.public_slug})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["display_name"], "Alice")

    def test_display_name_falls_back_to_email_prefix_when_name_fields_are_blank(self):
        user = User.objects.create_user(
            email="uniquereader@example.com",
            password="supersecure123",
            account_type=User.AccountType.PERSONAL,
        )
        self.assertEqual(user.display_name, "")
        self.assertEqual(user.first_name, "")
        profile = user.personal_profile
        profile.is_public = True
        profile.save(update_fields=["is_public"])

        response = self.client.get(
            reverse("users:public-profile-detail", kwargs={"public_slug": user.public_slug})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["display_name"], "uniquereader")


class BusinessClaimTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Sunbeam Books")

    def test_business_user_can_create_claim(self):
        user = User.objects.create_user(
            email="owner@example.com",
            password="supersecure123",
            account_type=User.AccountType.BUSINESS,
        )
        self.client.force_authenticate(user=user)

        response = self.client.post(
            reverse("users:business-claim-list"),
            {
                "company": self.company.id,
                "business_name": "Sunbeam Books",
                "business_email": "owner@sunbeam.com",
                "role_title": "Owner",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], BusinessClaim.VerificationStatus.PENDING)
        self.assertEqual(BusinessClaim.objects.get().user, user)

    def test_personal_user_cannot_create_claim(self):
        user = User.objects.create_user(
            email="reader@example.com",
            password="supersecure123",
            account_type=User.AccountType.PERSONAL,
        )
        self.client.force_authenticate(user=user)

        response = self.client.post(
            reverse("users:business-claim-list"),
            {
                "company": self.company.id,
                "business_name": "Sunbeam Books",
                "business_email": "owner@sunbeam.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_business_user_can_update_rejected_claim(self):
        user = User.objects.create_user(
            email="owner@example.com",
            password="supersecure123",
            account_type=User.AccountType.BUSINESS,
        )
        claim = BusinessClaim.objects.create(
            user=user,
            company=self.company,
            status=BusinessClaim.VerificationStatus.REJECTED,
            business_name="Sunbeam Books",
            business_email="old@sunbeam.com",
        )
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            reverse("users:business-claim-detail", kwargs={"pk": claim.pk}),
            {"business_email": "new@sunbeam.com"},
            format="json",
        )

        claim.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(claim.business_email, "new@sunbeam.com")

    def test_business_user_cannot_update_verified_claim(self):
        user = User.objects.create_user(
            email="owner@example.com",
            password="supersecure123",
            account_type=User.AccountType.BUSINESS,
        )
        claim = BusinessClaim.objects.create(
            user=user,
            company=self.company,
            status=BusinessClaim.VerificationStatus.VERIFIED,
            business_name="Sunbeam Books",
            business_email="owner@sunbeam.com",
        )
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            reverse("users:business-claim-detail", kwargs={"pk": claim.pk}),
            {"business_email": "new@sunbeam.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

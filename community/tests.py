from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Company
from users.models import BusinessClaim

from .models import CuratedList, CuratedListItem, Favorite, Recommendation, SavedCuratedList

User = get_user_model()


class CommunityApiTests(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="North Star Market")
        self.personal_user = User.objects.create_user(
            email="reader@example.com",
            password="supersecure123",
            account_type=User.AccountType.PERSONAL,
        )
        self.pending_business_user = User.objects.create_user(
            email="pending@example.com",
            password="supersecure123",
            account_type=User.AccountType.BUSINESS,
        )
        self.verified_business_user = User.objects.create_user(
            email="verified@example.com",
            password="supersecure123",
            account_type=User.AccountType.BUSINESS,
        )
        BusinessClaim.objects.create(
            user=self.pending_business_user,
            company=self.company,
            business_name="North Star Market",
            business_email="pending@example.com",
            status=BusinessClaim.VerificationStatus.PENDING,
        )
        BusinessClaim.objects.create(
            user=self.verified_business_user,
            company=self.company,
            business_name="North Star Market",
            business_email="verified@example.com",
            status=BusinessClaim.VerificationStatus.VERIFIED,
        )

    def test_personal_user_can_create_favorite(self):
        self.client.force_authenticate(user=self.personal_user)

        response = self.client.post(
            reverse("community:favorite-list"),
            {"company_id": self.company.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Favorite.objects.get().user, self.personal_user)

    def test_creating_duplicate_favorite_returns_existing_record(self):
        Favorite.objects.create(user=self.personal_user, company=self.company)
        self.client.force_authenticate(user=self.personal_user)

        response = self.client.post(
            reverse("community:favorite-list"),
            {"company_id": self.company.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Favorite.objects.filter(user=self.personal_user, company=self.company).count(), 1)

    def test_pending_business_user_can_create_favorite(self):
        self.client.force_authenticate(user=self.pending_business_user)

        response = self.client.post(
            reverse("community:favorite-list"),
            {"company_id": self.company.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Favorite.objects.get().user, self.pending_business_user)

    def test_verified_business_user_can_create_favorite(self):
        self.client.force_authenticate(user=self.verified_business_user)

        response = self.client.post(
            reverse("community:favorite-list"),
            {"company_id": self.company.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Favorite.objects.get().user, self.verified_business_user)

    def test_user_can_create_list_and_add_item(self):
        self.client.force_authenticate(user=self.personal_user)

        list_response = self.client.post(
            reverse("community:list-list"),
            {"title": "Weekend favorites", "description": "Good food and gifts", "is_public": True},
            format="json",
        )

        self.assertEqual(list_response.status_code, status.HTTP_201_CREATED)
        curated_list = CuratedList.objects.get()

        item_response = self.client.post(
            reverse("community:list-item-create", kwargs={"pk": curated_list.pk}),
            {"company_id": self.company.id, "note": "A staple", "position": 1},
            format="json",
        )

        self.assertEqual(item_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CuratedListItem.objects.get().company, self.company)

    def test_pending_business_user_can_create_private_list(self):
        self.client.force_authenticate(user=self.pending_business_user)

        response = self.client.post(
            reverse("community:list-list"),
            {"title": "Quiet favorites", "description": "For later", "is_public": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CuratedList.objects.get().user, self.pending_business_user)

    def test_pending_business_user_cannot_create_public_list(self):
        self.client.force_authenticate(user=self.pending_business_user)

        response = self.client.post(
            reverse("community:list-list"),
            {"title": "Quiet favorites", "description": "For later", "is_public": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Public lists unlock", response.data["is_public"][0])

    def test_user_can_delete_own_favorite(self):
        favorite = Favorite.objects.create(user=self.personal_user, company=self.company)
        self.client.force_authenticate(user=self.personal_user)

        response = self.client.delete(reverse("community:favorite-detail", kwargs={"pk": favorite.pk}))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Favorite.objects.filter(pk=favorite.pk).exists())

    def test_user_cannot_delete_another_users_list_item(self):
        curated_list = CuratedList.objects.create(user=self.personal_user, title="Weekend favorites")
        item = CuratedListItem.objects.create(curated_list=curated_list, company=self.company)
        self.client.force_authenticate(user=self.verified_business_user)

        response = self.client.delete(reverse("community:list-item-detail", kwargs={"pk": item.pk}))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_can_update_list_item_note_and_position(self):
        second_company = Company.objects.create(name="Cedar Cloth")
        curated_list = CuratedList.objects.create(user=self.personal_user, title="Weekend favorites")
        first_item = CuratedListItem.objects.create(curated_list=curated_list, company=self.company, position=1)
        second_item = CuratedListItem.objects.create(curated_list=curated_list, company=second_company, position=2)
        self.client.force_authenticate(user=self.personal_user)

        response = self.client.patch(
            reverse("community:list-item-detail", kwargs={"pk": second_item.pk}),
            {"note": "Moved up", "position": 1},
            format="json",
        )

        first_item.refresh_from_db()
        second_item.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_item.note, "Moved up")
        self.assertEqual(second_item.position, 1)
        self.assertEqual(first_item.position, 2)

    def test_new_list_item_defaults_to_end_of_list(self):
        second_company = Company.objects.create(name="Cedar Cloth")
        curated_list = CuratedList.objects.create(user=self.personal_user, title="Weekend favorites")
        CuratedListItem.objects.create(curated_list=curated_list, company=self.company, position=1)
        self.client.force_authenticate(user=self.personal_user)

        response = self.client.post(
            reverse("community:list-item-create", kwargs={"pk": curated_list.pk}),
            {"company_id": second_company.id, "note": "Last stop"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CuratedListItem.objects.get(company=second_company).position, 2)

    def test_public_list_detail_is_available_for_public_lists(self):
        curated_list = CuratedList.objects.create(
            user=self.personal_user,
            title="Weekend favorites",
            description="Neighborhood staples",
            is_public=True,
        )
        CuratedListItem.objects.create(curated_list=curated_list, company=self.company, position=1, note="A staple")

        response = self.client.get(
            reverse("community:public-list-detail", kwargs={"id_hash": curated_list.id_hash})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Weekend favorites")
        self.assertEqual(response.data["owner"]["account_type"], User.AccountType.PERSONAL)
        self.assertEqual(response.data["items"][0]["company"]["name"], "North Star Market")

    def test_public_list_detail_hides_private_lists(self):
        curated_list = CuratedList.objects.create(
            user=self.personal_user,
            title="Private notes",
            is_public=False,
        )

        response = self.client.get(
            reverse("community:public-list-detail", kwargs={"id_hash": curated_list.id_hash})
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_view_private_list_by_id_hash(self):
        curated_list = CuratedList.objects.create(
            user=self.personal_user,
            title="Private notes",
            description="Only for me",
            is_public=False,
        )
        CuratedListItem.objects.create(curated_list=curated_list, company=self.company, position=1, note="Keep this one close")
        self.client.force_authenticate(user=self.personal_user)

        response = self.client.get(
            reverse("community:list-detail-by-hash", kwargs={"id_hash": curated_list.id_hash})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Private notes")
        self.assertFalse(response.data["is_public"])
        self.assertEqual(response.data["items"][0]["company"]["name"], "North Star Market")

    def test_non_owner_cannot_view_private_list_by_id_hash(self):
        curated_list = CuratedList.objects.create(
            user=self.personal_user,
            title="Private notes",
            is_public=False,
        )
        self.client.force_authenticate(user=self.verified_business_user)

        response = self.client.get(
            reverse("community:list-detail-by-hash", kwargs={"id_hash": curated_list.id_hash})
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_personal_user_can_create_recommendation(self):
        self.client.force_authenticate(user=self.personal_user)

        response = self.client.post(
            reverse("community:recommendation-list"),
            {
                "company_id": self.company.id,
                "title": "Neighborhood staple",
                "body": "Warm team and consistently thoughtful selection.",
                "is_public": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Recommendation.objects.get().user, self.personal_user)

    def test_pending_business_user_cannot_create_recommendation(self):
        self.client.force_authenticate(user=self.pending_business_user)

        response = self.client.post(
            reverse("community:recommendation-list"),
            {
                "company_id": self.company.id,
                "title": "Neighborhood staple",
                "body": "Warm team and consistently thoughtful selection.",
                "is_public": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Public recommendations unlock", response.data["is_public"][0])

    def test_user_can_update_recommendation(self):
        recommendation = Recommendation.objects.create(
            user=self.personal_user,
            company=self.company,
            title="Neighborhood staple",
            body="Warm team.",
            is_public=True,
        )
        self.client.force_authenticate(user=self.personal_user)

        response = self.client.patch(
            reverse("community:recommendation-detail", kwargs={"pk": recommendation.pk}),
            {"body": "Warm team and consistently thoughtful selection."},
            format="json",
        )

        recommendation.refresh_from_db()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("consistently", recommendation.body)

    def test_public_list_search_matches_title(self):
        curated_list = CuratedList.objects.create(
            user=self.personal_user,
            title="Weekend favorites",
            is_public=True,
        )
        curated_list.items.create(company=self.company, position=1)

        response = self.client.get(reverse("community:public-list-list"), {"search": "weekend"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["title"], "Weekend favorites")

    def test_public_list_search_matches_curator_name(self):
        self.personal_user.display_name = "Reader One"
        self.personal_user.save(update_fields=["display_name"])
        curated_list = CuratedList.objects.create(
            user=self.personal_user,
            title="Neighborhood staples",
            is_public=True,
        )
        curated_list.items.create(company=self.company, position=1)

        response = self.client.get(reverse("community:public-list-list"), {"search": "reader"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["owner"]["display_name"], "Reader One")

    def test_public_list_search_matches_company_name(self):
        curated_list = CuratedList.objects.create(
            user=self.personal_user,
            title="Neighborhood staples",
            is_public=True,
        )
        curated_list.items.create(company=self.company, position=1)

        response = self.client.get(reverse("community:public-list-list"), {"search": "north star"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["preview_companies"][0]["name"], "North Star Market")

    def test_public_list_search_hides_private_lists(self):
        CuratedList.objects.create(
            user=self.personal_user,
            title="Private notes",
            is_public=False,
        ).items.create(company=self.company, position=1)

        response = self.client.get(reverse("community:public-list-list"), {"search": "private"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_user_can_save_another_users_public_list(self):
        curated_list = CuratedList.objects.create(
            user=self.verified_business_user,
            title="Weekend favorites",
            is_public=True,
        )
        curated_list.items.create(company=self.company, position=1)
        self.client.force_authenticate(user=self.personal_user)

        response = self.client.post(
            reverse("community:saved-list-list"),
            {"curated_list_id": curated_list.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SavedCuratedList.objects.get().user, self.personal_user)
        self.assertEqual(response.data["list"]["title"], "Weekend favorites")

    def test_user_cannot_save_own_public_list(self):
        curated_list = CuratedList.objects.create(
            user=self.personal_user,
            title="Weekend favorites",
            is_public=True,
        )
        self.client.force_authenticate(user=self.personal_user)

        response = self.client.post(
            reverse("community:saved-list-list"),
            {"curated_list_id": curated_list.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("other users", response.data["curated_list_id"][0])

    def test_user_cannot_save_private_list(self):
        curated_list = CuratedList.objects.create(
            user=self.verified_business_user,
            title="Private notes",
            is_public=False,
        )
        self.client.force_authenticate(user=self.personal_user)

        response = self.client.post(
            reverse("community:saved-list-list"),
            {"curated_list_id": curated_list.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only public lists", response.data["curated_list_id"][0])

    def test_duplicate_saved_list_returns_existing_record(self):
        curated_list = CuratedList.objects.create(
            user=self.verified_business_user,
            title="Weekend favorites",
            is_public=True,
        )
        SavedCuratedList.objects.create(user=self.personal_user, curated_list=curated_list)
        self.client.force_authenticate(user=self.personal_user)

        response = self.client.post(
            reverse("community:saved-list-list"),
            {"curated_list_id": curated_list.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SavedCuratedList.objects.filter(user=self.personal_user, curated_list=curated_list).count(), 1)

    def test_saved_lists_hide_entries_for_lists_that_become_private(self):
        curated_list = CuratedList.objects.create(
            user=self.verified_business_user,
            title="Weekend favorites",
            is_public=True,
        )
        SavedCuratedList.objects.create(user=self.personal_user, curated_list=curated_list)
        curated_list.is_public = False
        curated_list.save(update_fields=["is_public"])
        self.client.force_authenticate(user=self.personal_user)

        response = self.client.get(reverse("community:saved-list-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_user_can_delete_saved_list(self):
        curated_list = CuratedList.objects.create(
            user=self.verified_business_user,
            title="Weekend favorites",
            is_public=True,
        )
        saved_list = SavedCuratedList.objects.create(user=self.personal_user, curated_list=curated_list)
        self.client.force_authenticate(user=self.personal_user)

        response = self.client.delete(reverse("community:saved-list-detail", kwargs={"pk": saved_list.pk}))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SavedCuratedList.objects.filter(pk=saved_list.pk).exists())

    def test_user_cannot_delete_another_users_saved_list(self):
        curated_list = CuratedList.objects.create(
            user=self.verified_business_user,
            title="Weekend favorites",
            is_public=True,
        )
        saved_list = SavedCuratedList.objects.create(user=self.personal_user, curated_list=curated_list)
        self.client.force_authenticate(user=self.pending_business_user)

        response = self.client.delete(reverse("community:saved-list-detail", kwargs={"pk": saved_list.pk}))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

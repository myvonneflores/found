from django.db import models, transaction
from django.db.models import Max
from rest_framework import serializers

from companies.serializers import CompanyListSerializer

from .models import CuratedList, CuratedListItem, Favorite, Recommendation


class FavoriteSerializer(serializers.ModelSerializer):
    company = CompanyListSerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(
        source="company",
        queryset=Favorite._meta.get_field("company").remote_field.model.objects.all(),
        write_only=True,
    )

    class Meta:
        model = Favorite
        fields = ("id", "company", "company_id", "created_at")
        read_only_fields = ("id", "created_at", "company")

    def create(self, validated_data):
        favorite, _created = Favorite.objects.get_or_create(
            user=self.context["request"].user,
            company=validated_data["company"],
        )
        return favorite


class CuratedListItemSerializer(serializers.ModelSerializer):
    company = CompanyListSerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(
        source="company",
        queryset=CuratedListItem._meta.get_field("company").remote_field.model.objects.all(),
        write_only=True,
    )

    class Meta:
        model = CuratedListItem
        fields = ("id", "company", "company_id", "note", "position", "created_at")
        read_only_fields = ("id", "created_at", "company")


class CuratedListSerializer(serializers.ModelSerializer):
    items = CuratedListItemSerializer(many=True, read_only=True)

    class Meta:
        model = CuratedList
        fields = ("id", "id_hash", "title", "description", "is_public", "created_at", "updated_at", "items")
        read_only_fields = ("id", "id_hash", "created_at", "updated_at", "items")

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        is_public = attrs.get("is_public", getattr(self.instance, "is_public", False))
        if user.account_type == user.AccountType.BUSINESS and not user.is_business_verified and is_public:
            raise serializers.ValidationError({"is_public": "Public lists unlock after your business is verified."})
        return attrs

    def create(self, validated_data):
        return CuratedList.objects.create(user=self.context["request"].user, **validated_data)


class PublicCuratedListSerializer(serializers.ModelSerializer):
    items = CuratedListItemSerializer(many=True, read_only=True)
    owner = serializers.SerializerMethodField()

    class Meta:
        model = CuratedList
        fields = (
            "id",
            "id_hash",
            "title",
            "description",
            "is_public",
            "created_at",
            "updated_at",
            "owner",
            "items",
        )

    def get_owner(self, obj):
        user = obj.user
        display_name = user.display_name or user.first_name or user.email.split("@")[0]
        return {
            "display_name": display_name,
            "public_slug": user.public_slug,
            "account_type": user.account_type,
        }


class RecommendationSerializer(serializers.ModelSerializer):
    company = CompanyListSerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(
        source="company",
        queryset=Recommendation._meta.get_field("company").remote_field.model.objects.all(),
        write_only=True,
    )

    class Meta:
        model = Recommendation
        fields = ("id", "id_hash", "company", "company_id", "title", "body", "is_public", "created_at", "updated_at")
        read_only_fields = ("id", "id_hash", "company", "created_at", "updated_at")

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user
        is_public = attrs.get("is_public", getattr(self.instance, "is_public", True))
        if user.account_type == user.AccountType.BUSINESS and not user.is_business_verified and is_public:
            raise serializers.ValidationError(
                {"is_public": "Public recommendations unlock after your business is verified."}
            )
        return attrs

    def create(self, validated_data):
        return Recommendation.objects.create(user=self.context["request"].user, **validated_data)


class PublicRecommendationSerializer(serializers.ModelSerializer):
    company = CompanyListSerializer(read_only=True)

    class Meta:
        model = Recommendation
        fields = ("id", "id_hash", "company", "title", "body", "created_at", "updated_at")


class CuratedListItemCreateSerializer(serializers.ModelSerializer):
    company_id = serializers.PrimaryKeyRelatedField(
        source="company",
        queryset=CuratedListItem._meta.get_field("company").remote_field.model.objects.all(),
    )
    position = serializers.IntegerField(min_value=1, required=False)

    class Meta:
        model = CuratedListItem
        fields = ("company_id", "note", "position")

    def create(self, validated_data):
        curated_list = validated_data.pop("curated_list")
        position = validated_data.pop("position", None)
        max_position = curated_list.items.aggregate(max_position=Max("position"))["max_position"] or 0

        if position is None:
            position = max_position + 1
        else:
            position = min(max(position, 1), max_position + 1)

        with transaction.atomic():
            curated_list.items.filter(position__gte=position).update(position=models.F("position") + 1)
            return CuratedListItem.objects.create(curated_list=curated_list, position=position, **validated_data)


class CuratedListItemUpdateSerializer(serializers.ModelSerializer):
    position = serializers.IntegerField(min_value=1, required=False)

    class Meta:
        model = CuratedListItem
        fields = ("note", "position")

    def update(self, instance, validated_data):
        new_position = validated_data.pop("position", instance.position)
        note = validated_data.pop("note", instance.note)
        siblings = CuratedListItem.objects.filter(curated_list=instance.curated_list).exclude(pk=instance.pk)
        max_position = siblings.count() + 1
        new_position = min(max(new_position, 1), max_position)

        with transaction.atomic():
            if new_position < instance.position:
                siblings.filter(position__gte=new_position, position__lt=instance.position).update(position=models.F("position") + 1)
            elif new_position > instance.position:
                siblings.filter(position__gt=instance.position, position__lte=new_position).update(position=models.F("position") - 1)

            instance.position = new_position
            instance.note = note
            instance.save(update_fields=("position", "note", "updated_at"))

        return instance

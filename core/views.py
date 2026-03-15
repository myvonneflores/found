import traceback

from django.http import JsonResponse
from rest_framework.views import exception_handler


def healthcheck(_request):
    return JsonResponse({"status": "ok"})


def debug_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        tb = traceback.format_exc()
        from rest_framework.response import Response
        from rest_framework import status

        return Response(
            {"error": str(exc), "traceback": tb},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    return response
